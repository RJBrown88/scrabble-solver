import classNames from 'classnames';
import { type DragEvent, type FunctionComponent, memo, type ChangeEvent, useCallback, useRef } from 'react';

import { Button } from 'components';

import styles from './Dropzone.module.scss';

interface Props {
  className?: string;
  onImageSelected: (imageDataUrl: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const DropzoneBase: FunctionComponent<Props> = ({ className, onImageSelected, disabled, placeholder }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onImageSelected(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) {
        return;
      }

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (disabled) {
        return;
      }

      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          handleFile(file);
        }
      }
    },
    [disabled, handleFile],
  );

  // Set up paste listener
  useCallback(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <div
      className={classNames(styles.dropzone, className, {
        [styles.disabled]: disabled,
      })}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Upload screenshot"
    >
      <div className={styles.content}>
        <div className={styles.icon}>📸</div>
        <div className={styles.text}>{placeholder || 'Drop or paste a screenshot here'}</div>
        <Button className={styles.button} disabled={disabled}>
          Choose File
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className={styles.fileInput}
        aria-hidden="true"
      />
    </div>
  );
};

export const Dropzone = memo(DropzoneBase);
