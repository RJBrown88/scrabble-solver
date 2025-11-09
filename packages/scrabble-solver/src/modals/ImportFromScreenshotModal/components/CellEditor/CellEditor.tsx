import classNames from 'classnames';
import { type FunctionComponent, memo, useCallback, useState } from 'react';

import type { ImportCell, ImportCellEdit } from '@scrabble-solver/types';

import { Button } from 'components';

import styles from './CellEditor.module.scss';

interface Props {
  className?: string;
  cells: ImportCell[];
  onEdit: (edit: ImportCellEdit) => void;
  confidenceLabel: string;
  editLabel: string;
}

const CellEditorBase: FunctionComponent<Props> = ({ className, cells, onEdit, confidenceLabel, editLabel }) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editIsBlank, setEditIsBlank] = useState<boolean>(false);

  // Filter to only show non-empty cells
  const nonEmptyCells = cells.filter((cell) => cell.letter !== null);

  const handleEditClick = useCallback((cell: ImportCell) => {
    setEditingCell({ row: cell.row, col: cell.col });
    setEditValue(cell.letter || '');
    setEditIsBlank(cell.isBlank || false);
  }, []);

  const handleSave = useCallback(() => {
    if (!editingCell) {
      return;
    }

    onEdit({
      row: editingCell.row,
      col: editingCell.col,
      letter: editValue || null,
      isBlank: editIsBlank,
    });

    setEditingCell(null);
  }, [editingCell, editValue, editIsBlank, onEdit]);

  const handleCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  if (nonEmptyCells.length === 0) {
    return null;
  }

  return (
    <div className={classNames(styles.cellEditor, className)}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Row</th>
            <th>Col</th>
            <th>Letter</th>
            <th>{confidenceLabel}</th>
            <th>Blank</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {nonEmptyCells.map((cell) => {
            const isEditing = editingCell?.row === cell.row && editingCell?.col === cell.col;
            const isLowConfidence = cell.confidence < 0.7;

            return (
              <tr
                key={`${cell.row}-${cell.col}`}
                className={classNames({
                  [styles.lowConfidence]: isLowConfidence,
                  [styles.editing]: isEditing,
                })}
              >
                <td>{cell.row + 1}</td>
                <td>{cell.col + 1}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className={styles.input}
                      maxLength={2}
                      autoFocus
                    />
                  ) : (
                    <span className={styles.letter}>{cell.letter}</span>
                  )}
                </td>
                <td>
                  <span
                    className={classNames(styles.confidence, {
                      [styles.high]: cell.confidence >= 0.9,
                      [styles.medium]: cell.confidence >= 0.7 && cell.confidence < 0.9,
                      [styles.low]: cell.confidence < 0.7,
                    })}
                  >
                    {Math.round(cell.confidence * 100)}%
                  </span>
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={editIsBlank}
                      onChange={(e) => setEditIsBlank(e.target.checked)}
                      className={styles.checkbox}
                    />
                  ) : (
                    <span>{cell.isBlank ? '✓' : '-'}</span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div className={styles.actions}>
                      <Button size="small" onClick={handleSave}>
                        Save
                      </Button>
                      <Button size="small" variant="secondary" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="small" variant="secondary" onClick={() => handleEditClick(cell)}>
                      {editLabel}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const CellEditor = memo(CellEditorBase);
