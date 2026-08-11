'use client';

/**
 * Import creation track — Biographer agent entry point.
 *
 * Phase flow:
 *   'pick'     — file picker / drop zone
 *   'preview'  — extracted text shown to user before anything is sent
 *   'converse' — Biographer conversation (wired in Checkpoint 3)
 */

import { useCallback, useRef, useState } from 'react';
import {
  extractDocument,
  type ExtractionResult,
  ExtractionError,
} from '../../../../lib/biographer/extract-document';
import {
  saveImportDocument,
  clearImportSession,
} from '../../../../lib/biographer/client-storage';
import {
  BIOGRAPHER_HARD_WORD_LIMIT,
  BIOGRAPHER_SOFT_WORD_LIMIT,
} from '../../../../lib/biographer/constants';
import BiographerView from './BiographerView';

type Phase = 'pick' | 'preview' | 'converse';

function wordCountLabel(n: number): string {
  return n.toLocaleString() + ' word' + (n === 1 ? '' : 's');
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('pick');
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  // ── File handling ────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setExtractionError(null);
    setResult(null);
    setExtracting(true);
    try {
      const extraction = await extractDocument(file);
      setResult(extraction);
      setPhase('preview');
    } catch (err) {
      setExtractionError(
        err instanceof ExtractionError
          ? err.message
          : 'Something went wrong reading that file. Please try again.',
      );
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleReplaceFile = () => {
    setResult(null);
    setExtractionError(null);
    setPhase('pick');
  };

  const handleContinue = () => {
    if (!result) return;
    clearImportSession();        // clear any stale prior session
    saveImportDocument(result);
    setPhase('converse');
  };

  const handleStartOver = () => {
    clearImportSession();
    setResult(null);
    setExtractionError(null);
    setPhase('pick');
  };

  // ── Derived ──────────────────────────────────────────────────────────

  const isHard = result && result.wordCount > BIOGRAPHER_HARD_WORD_LIMIT;
  const isSoft = result && !isHard && result.wordCount > BIOGRAPHER_SOFT_WORD_LIMIT;

  // ── Render ───────────────────────────────────────────────────────────

  if (phase === 'converse') {
    return <BiographerView onStartOver={handleStartOver} />;
  }

  return (
    <div className="import-page">
      <p className="eyebrow" style={{ marginBottom: 12 }}>Create · Import</p>
      <h1 className="import-page__title">
        Bring a document in.
      </h1>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.65,
          color: 'var(--fg-3)',
          margin: '0 0 40px',
          maxWidth: 480,
        }}
      >
        Upload something you've already written — a letter, a journal entry, a family history.
        The Biographer will help you turn it into kinlooms.
      </p>

      {/* ── Pick phase ─────────────────────────────────────────────── */}
      {phase === 'pick' && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a document"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            style={{
              border: `2px dashed ${dragging ? 'var(--primary, #556b5b)' : 'var(--border, #d4d2cc)'}`,
              borderRadius: 12,
              padding: '52px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(85,107,91,0.04)' : 'var(--card)',
              transition: 'border-color 150ms ease, background 150ms ease',
              marginBottom: 16,
              outline: 'none',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.docx,.pdf"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            {extracting ? (
              <p style={{ fontSize: 15, color: 'var(--fg-3)', margin: 0 }}>Reading document…</p>
            ) : (
              <>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--fg-4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ margin: '0 auto 12px', display: 'block' }}
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg-2)', margin: '0 0 4px' }}>
                  Choose a file or drag it here
                </p>
                <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: 0 }}>
                  .txt · .md · .docx · .pdf
                </p>
              </>
            )}
          </div>

          {extractionError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '12px 16px',
              }}
            >
              <p style={{ fontSize: 14, color: '#b91c1c', margin: 0 }}>{extractionError}</p>
            </div>
          )}
        </>
      )}

      {/* ── Preview phase ──────────────────────────────────────────── */}
      {phase === 'preview' && result && (
        <>
          {/* File meta row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--fg-1)', margin: '0 0 2px' }}>
                {result.filename}
              </p>
              <p style={{ fontSize: 13, color: 'var(--fg-4)', margin: 0 }}>
                {wordCountLabel(result.wordCount)}
              </p>
            </div>
            <button
              onClick={handleReplaceFile}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: 'var(--fg-4)',
                cursor: 'pointer',
                padding: '4px 0',
                fontFamily: 'inherit',
              }}
            >
              Replace file
            </button>
          </div>

          {/* Size advisories */}
          {isSoft && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                This is a long document. The Biographer will work through it section by section.
              </p>
            </div>
          )}
          {isHard && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>
                This document is very long ({wordCountLabel(result.wordCount)}). You may want to
                split it into smaller files first. You can still continue if you'd like.
              </p>
            </div>
          )}

          {/* Extracted text preview */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '16px 20px',
              maxHeight: 260,
              overflowY: 'auto',
              marginBottom: 10,
            }}
          >
            <pre
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--fg-3)',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
              }}
            >
              {result.text.slice(0, 2_400)}
              {result.text.length > 2_400 ? '\n\n[…]' : ''}
            </pre>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '0 0 24px' }}>
            This is exactly what the Biographer will read. Nothing has left your browser yet.
          </p>

          <button
            onClick={handleContinue}
            style={{
              background: 'var(--primary, #556b5b)',
              color: '#fdfcfa',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Continue with the Biographer →
          </button>
        </>
      )}
    </div>
  );
}
