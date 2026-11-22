import { loadExample } from '../io/projectIO';
import { listExamples } from '../io/examples';
import { Icon } from './Icon';

/** One entry per example project shipped with the app (the files of src/assets/examples). */
export function ExamplesList({ onPick, className = 'menu-btn', iconSize = 18 }: { onPick?: () => void; className?: string; iconSize?: number }) {
  return (
    <>
      {listExamples().map((e) => (
        <button
          key={e.id}
          className={className}
          onClick={() => {
            onPick?.();
            void loadExample(e.id);
          }}
        >
          <Icon name="download" size={iconSize} /> {e.title}
        </button>
      ))}
    </>
  );
}
