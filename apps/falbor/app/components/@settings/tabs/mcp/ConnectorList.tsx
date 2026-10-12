import { classNames } from '~/utils/classNames';
import { MCP_CONNECTORS } from './connectors';

interface ConnectorListProps {
  onSelect: (id: string) => void;
}

export default function ConnectorList({ onSelect }: ConnectorListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {MCP_CONNECTORS.map((connector) => (
        <button
          key={connector.id}
          data-connector-id={connector.id}
          onClick={() => onSelect(connector.id)}
          className={classNames(
            'flex flex-col items-start p-3 text-left rounded-xl border transition-all duration-200',
            'bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3',
            'border-falbor-elements-borderColor dark:border-falbor-elements-borderColor-dark',
            'hover:border-falbor-elements-borderActive',
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src={connector.logo} alt={connector.name} className="w-6 h-6 object-contain bg-transparent rounded-lg" />
            <h3 className="text-sm font-semibold text-falbor-elements-textPrimary">
              {connector.name}
            </h3>
          </div>
          <p className="text-xs text-falbor-elements-textSecondary line-clamp-2">
            {connector.description}
          </p>
        </button>
      ))}
    </div>
  );
}
