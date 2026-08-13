import { useAppStore } from '../store';

export default function Notifications() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const config = useAppStore((s) => s.config);

  return (
    <div className={'noties-container -' + (config.notiesPosition ?? 'right')}>
      {notifications.map((noty) => (
        <div
          key={String(noty.id)}
          className={
            'noty -' + (noty.type ?? 'info') + (noty.showed ? ' -showed' : '')
          }
        >
          <div className="noty-header">
            {noty.title ? <div className="noty-title">{noty.title}</div> : null}
            <div className="noty-close" onClick={() => removeNotification(noty.id as string | number)}>
              <i className="mdi mdi-close" />
            </div>
          </div>
          <div className="noty-content">
            {noty.icon ? (
              <div className="noty-icon">
                <i className={'mdi ' + noty.icon} />
              </div>
            ) : null}
            <div className="noty-message" dangerouslySetInnerHTML={{ __html: noty.message ?? '' }} />
          </div>
          {noty.lifetime ? (
            <div className="noty-lifetime">
              <div
                className="noty-lifetime-line"
                style={{ animationDuration: `${noty.lifetime}s` }}
              />
            </div>
          ) : null}
        </div>
      ))}
      {notifications.length > 1 ? (
        <div className="noties-button" onClick={() => clearNotifications()}>
          Clear all
        </div>
      ) : null}
    </div>
  );
}