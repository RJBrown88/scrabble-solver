import classNames from 'classnames';
import { type FunctionComponent, memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { ImportStage } from '@scrabble-solver/types';

import { Alert, Button, Modal } from 'components';
import {
  importFromScreenshotSlice,
  selectCanApplyImport,
  selectImportEdits,
  selectImportError,
  selectImportImageDataUrl,
  selectImportProgress,
  selectImportResult,
  selectImportStage,
  selectLowConfidenceCells,
  selectMergedCells,
  useTranslate,
  useTypedSelector,
} from 'state';

import { CellEditor, Dropzone, ProgressBar } from './components';
import styles from './ImportFromScreenshotModal.module.scss';

interface Props {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ImportFromScreenshotModalBase: FunctionComponent<Props> = ({ className, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const translate = useTranslate();

  const stage = useTypedSelector(selectImportStage);
  const imageDataUrl = useTypedSelector(selectImportImageDataUrl);
  const progress = useTypedSelector(selectImportProgress);
  const result = useTypedSelector(selectImportResult);
  const error = useTypedSelector(selectImportError);
  const lowConfidenceCells = useTypedSelector(selectLowConfidenceCells);
  const mergedCells = useTypedSelector(selectMergedCells);
  const canApply = useTypedSelector(selectCanApplyImport);

  // Reset on close
  const handleClose = useCallback(() => {
    dispatch(importFromScreenshotSlice.actions.cancel());
    onClose();
  }, [dispatch, onClose]);

  // Handle image upload
  const handleImageSelected = useCallback(
    (dataUrl: string) => {
      dispatch(importFromScreenshotSlice.actions.uploadImage({ imageDataUrl: dataUrl }));
      dispatch(importFromScreenshotSlice.actions.startProcessing());
    },
    [dispatch],
  );

  // Handle cell edit
  const handleCellEdit = useCallback(
    (edit: Parameters<typeof importFromScreenshotSlice.actions.editCell>[0]) => {
      dispatch(importFromScreenshotSlice.actions.editCell(edit));
    },
    [dispatch],
  );

  // Apply to board
  const handleApplyToBoard = useCallback(() => {
    dispatch(importFromScreenshotSlice.actions.applyToBoard());
    onClose();
  }, [dispatch, onClose]);

  // Replace entire board
  const handleReplaceBoard = useCallback(() => {
    dispatch(importFromScreenshotSlice.actions.replaceBoard());
    onClose();
  }, [dispatch, onClose]);

  // Retry
  const handleRetry = useCallback(() => {
    dispatch(importFromScreenshotSlice.actions.reset());
  }, [dispatch]);

  // Get stage label
  const getStageLabel = useCallback(
    (currentStage: ImportStage): string => {
      switch (currentStage) {
        case 'detecting-grid':
          return translate('detectingGrid');
        case 'recognizing-tiles':
          return translate('recognizingTiles');
        case 'preview':
          return translate('reviewAndApply');
        default:
          return translate('processingImage');
      }
    },
    [translate],
  );

  return (
    <Modal
      className={className}
      isOpen={isOpen}
      title={translate('importFromScreenshot')}
      onClose={handleClose}
      size="large"
    >
      {/* Step 1: Upload */}
      {stage === 'idle' && (
        <Modal.Section>
          <Dropzone
            onImageSelected={handleImageSelected}
            placeholder={translate('dropOrPasteImage')}
          />
        </Modal.Section>
      )}

      {/* Step 2: Processing */}
      {(stage === 'detecting-grid' || stage === 'recognizing-tiles') && (
        <Modal.Section>
          {imageDataUrl && (
            <div className={styles.imagePreview}>
              <img src={imageDataUrl} alt="Uploaded screenshot" className={styles.image} />
            </div>
          )}

          <ProgressBar
            progress={progress}
            stage={stage}
            stageLabel={getStageLabel(stage)}
          />
        </Modal.Section>
      )}

      {/* Step 3: Preview and Edit */}
      {stage === 'preview' && result && (
        <>
          <Modal.Section title={translate('detectedCells')}>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>{translate('totalDetected')}:</span>
                <span className={styles.statValue}>
                  {result.cells.filter((c) => c.letter !== null).length}
                </span>
              </div>
              {lowConfidenceCells.length > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statLabel}>{translate('lowConfidenceCells')}:</span>
                  <span className={classNames(styles.statValue, styles.warning)}>
                    {lowConfidenceCells.length}
                  </span>
                </div>
              )}
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <Alert variant="warning" className={styles.warnings}>
                <div className={styles.warningTitle}>{translate('imageQualityWarning')}</div>
                <ul className={styles.warningList}>
                  {result.warnings.slice(0, 5).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {result.warnings.length > 5 && (
                    <li>...and {result.warnings.length - 5} more</li>
                  )}
                </ul>
              </Alert>
            )}

            <CellEditor
              cells={mergedCells}
              onEdit={handleCellEdit}
              confidenceLabel={translate('confidence')}
              editLabel={translate('editCell')}
            />
          </Modal.Section>

          <Modal.Section>
            <div className={styles.actions}>
              <Button
                onClick={handleApplyToBoard}
                disabled={!canApply}
                variant="primary"
              >
                {translate('applyToBoard')}
              </Button>
              <Button
                onClick={handleReplaceBoard}
                disabled={!canApply}
                variant="secondary"
              >
                {translate('replaceBoard')}
              </Button>
              <Button onClick={handleRetry} variant="secondary">
                {translate('retry')}
              </Button>
            </div>
          </Modal.Section>
        </>
      )}

      {/* Error State */}
      {stage === 'error' && error && (
        <Modal.Section>
          <Alert variant="error" className={styles.error}>
            <div className={styles.errorTitle}>Error</div>
            <div className={styles.errorMessage}>{error}</div>
          </Alert>

          <div className={styles.actions}>
            <Button onClick={handleRetry} variant="primary">
              {translate('retry')}
            </Button>
          </div>
        </Modal.Section>
      )}
    </Modal>
  );
};

export const ImportFromScreenshotModal = memo(ImportFromScreenshotModalBase);
