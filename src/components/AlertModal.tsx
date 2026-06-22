import { useEffect, useState } from 'react'
import type { Attraction, QueueAlertType } from '../types'
import { BellIcon, CloseIcon } from './Icons'

interface AlertModalProps {
  attraction: Attraction
  parkName: string
  onClose: () => void
  onCreate: (type: QueueAlertType, targetWaitTime?: number) => void
}

const alertOptions: Array<{
  type: QueueAlertType
  label: string
  description: string
}> = [
  {
    type: 'WAIT_TIME',
    label: 'Fila abaixo da meta',
    description: 'Avise quando a espera chegar ao tempo escolhido.',
  },
  {
    type: 'ATTRACTION_OPEN',
    label: 'Quando a atração abrir',
    description: 'Ideal para atrações fechadas temporariamente.',
  },
  {
    type: 'PREDICTION_DROP',
    label: 'Quando houver previsão de queda',
    description: 'Usa o histórico local para detectar tendência de baixa.',
  },
  {
    type: 'BEST_TIME',
    label: 'Melhor momento para ir',
    description: 'Combina fila atual e tendência para recomendar a hora.',
  },
]

export function AlertModal({
  attraction,
  parkName,
  onClose,
  onCreate,
}: AlertModalProps) {
  const [type, setType] = useState<QueueAlertType>('WAIT_TIME')
  const [targetWaitTime, setTargetWaitTime] = useState(
    Math.max(5, Math.min(60, (attraction.waitTime ?? 30) - 10)),
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="alert-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="alert-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span><BellIcon /></span>
          <div>
            <small>{parkName}</small>
            <h2 id="alert-modal-title">Criar alerta para esta atração</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar criação de alerta">
            <CloseIcon />
          </button>
        </header>

        <div className="alert-modal-attraction">
          <strong>{attraction.name}</strong>
          <span>
            {attraction.status === 'open'
              ? `${attraction.waitTime ?? '—'} min agora`
              : 'Atração fechada'}
          </span>
        </div>

        <div className="alert-type-options">
          {alertOptions.map((option) => (
            <label key={option.type} className={type === option.type ? 'is-selected' : ''}>
              <input
                type="radio"
                name="alert-type"
                value={option.type}
                checked={type === option.type}
                onChange={() => setType(option.type)}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <i aria-hidden="true" />
            </label>
          ))}
        </div>

        {type === 'WAIT_TIME' && (
          <label className="alert-target-field">
            <span>Meta de fila</span>
            <div>
              <input
                type="number"
                min="0"
                max="300"
                step="5"
                value={targetWaitTime}
                onChange={(event) => setTargetWaitTime(Number(event.target.value))}
              />
              <strong>min</strong>
            </div>
          </label>
        )}

        <button
          className="alert-create-button"
          type="button"
          onClick={() => onCreate(type, type === 'WAIT_TIME' ? targetWaitTime : undefined)}
        >
          <BellIcon />
          Começar a monitorar
        </button>
        <p>O alerta fica salvo neste dispositivo. Push será adicionado futuramente.</p>
      </section>
    </div>
  )
}
