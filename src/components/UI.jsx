import React from 'react';
import { X, LoaderCircle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export function Logo({ compact = false }) {
  return <div className="brand"><div className="brand-mark"><span>E</span><span className="brand-dot" /></div>{!compact && <span className="brand-text">Edu<span>Canvas</span></span>}</div>;
}
export function Spinner({ label = 'Đang tải...' }) {
  return <div className="spinner-wrap"><LoaderCircle size={23} className="spin"/><span>{label}</span></div>;
}
export function Modal({ title, onClose, children, narrow = false }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={'modal ' + (narrow ? 'modal-narrow' : '')} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading"><h3>{title}</h3><button aria-label="Đóng" className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}
    </div>
  </div>;
}
export function Toast({ message, kind = 'info', onClose }) {
  if (!message) return null;
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return <div className={'toast toast-' + kind} role="status"><Icon size={19}/><span>{message}</span><button onClick={onClose} aria-label="Đóng thông báo"><X size={16}/></button></div>;
}
export function Initials({ name = '?', size = 'md' }) {
  const letters = name.trim().split(/\s+/).slice(-2).map(x => x.slice(0, 1)).join('').toUpperCase();
  return <span className={'avatar avatar-' + size}>{letters || '?'}</span>;
}
