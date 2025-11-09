import classNames from 'classnames';
import { type FunctionComponent, memo } from 'react';

import type { ImportStage } from '@scrabble-solver/types';

import styles from './ProgressBar.module.scss';

interface Props {
  className?: string;
  progress: number;
  stage: ImportStage;
  stageLabel: string;
}

const ProgressBarBase: FunctionComponent<Props> = ({ className, progress, stage, stageLabel }) => {
  return (
    <div className={classNames(styles.progressBar, className)}>
      <div className={styles.label}>
        <span className={styles.stageName}>{stageLabel}</span>
        <span className={styles.percentage}>{progress}%</span>
      </div>

      <div className={styles.track}>
        <div
          className={classNames(styles.fill, {
            [styles.detecting]: stage === 'detecting-grid',
            [styles.recognizing]: stage === 'recognizing-tiles',
          })}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ProgressBar = memo(ProgressBarBase);
