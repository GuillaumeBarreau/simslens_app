import { useNavigate } from 'react-router-dom';

type StepId = 'onboarding' | 'pair' | 'connected';

interface Step {
  id: StepId;
  label: string;
  path: string;
}

const STEPS: Step[] = [
  { id: 'onboarding', label: '1. Configuration', path: '/onboarding' },
  { id: 'pair', label: '2. Connexion', path: '/pair' },
  { id: 'connected', label: '3. Sync', path: '/connected' },
];

interface Props {
  current: StepId;
}

export default function Stepper({ current }: Props) {
  const navigate = useNavigate();

  return (
    <div className="stepper">
      {STEPS.map((step) => {
        const isActive = step.id === current;
        return (
          <button
            type="button"
            key={step.id}
            className={`step-btn${isActive ? ' active' : ''}`}
            onClick={() => navigate(step.path)}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
