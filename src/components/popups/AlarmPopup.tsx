import { useAppStore } from '../../store';
import { entityState, getItemEntity } from '../../utils/entity';

export default function AlarmPopup() {
  const activeAlarm = useAppStore((s) => s.activeAlarm);
  const alarmCode = useAppStore((s) => s.alarmCode);
  const states = useAppStore((s) => s.entities);
  const closeAlarm = useAppStore((s) => s.closeAlarm);
  const inputAlarmDigit = useAppStore((s) => s.inputAlarmDigit);
  const clearAlarmCode = useAppStore((s) => s.clearAlarmCode);
  const actionAlarm = useAppStore((s) => s.actionAlarm);

  if (!activeAlarm) return null;
  const entity = getItemEntity(activeAlarm, states);
  if (!entity) return null;
  const hasCode = !!entity.attributes.code_format;
  const armed = entity.state !== 'disarmed';

  return (
    <div className="alarm-popup">
      <div className="alarm-popup-overlay" onClick={() => closeAlarm()} />
      <div className={'alarm-popup-container' + (hasCode ? '' : ' -no-code')}>
        <div className="alarm-popup-close" onClick={() => closeAlarm()}>
          <i className="mdi mdi-close" />
        </div>

        <div className="alarm-popup-state">
          <span>{entityState(activeAlarm, entity, states)}</span>
        </div>

        {hasCode && (
          <div className="alarm-popup-input-container">
            <div className="alarm-popup-input">
              {alarmCode ? (
                <div className="alarm-popup-input-code">
                  {alarmCode.split('').map((_d, i) => (
                    <span key={i}>•</span>
                  ))}
                </div>
              ) : (
                <div className="alarm-popup-input-placeholder">Enter code</div>
              )}
            </div>
          </div>
        )}

        <div className="alarm-popup-buttons">
          {hasCode && (
            <>
              {[6, 3, 0].map((line, li) => (
                <div className="alarm-popup-buttons-line" key={li}>
                  {[1, 2, 3].map((button) => (
                    <div
                      className="alarm-popup-button"
                      key={button}
                      onClick={() => inputAlarmDigit(button + line)}
                    >
                      {button + line}
                    </div>
                  ))}
                </div>
              ))}
              <div className="alarm-popup-buttons-line">
                <div className="alarm-popup-button -l2" onClick={() => inputAlarmDigit(0)}>
                  0
                </div>
                <div className="alarm-popup-button -warning" onClick={() => clearAlarmCode()}>
                  <div className="mdi mdi-close" />
                </div>
              </div>
            </>
          )}

          <div className="alarm-popup-buttons-line">
            {!armed && (
              <>
                <div
                  className="alarm-popup-button -icon -home"
                  onClick={() => actionAlarm('alarm_arm_home')}
                >
                  <div className="mdi mdi-bell-plus" /> Arm home
                </div>
                <div
                  className="alarm-popup-button -icon -away"
                  onClick={() => actionAlarm('alarm_arm_away')}
                >
                  <div className="mdi mdi-bell" /> Arm away
                </div>
                <div
                  className="alarm-popup-button -icon -night"
                  onClick={() => actionAlarm('alarm_arm_night')}
                >
                  <div className="mdi mdi-sleep" /> Arm night
                </div>
              </>
            )}
            {armed && (
              <div
                className="alarm-popup-button -icon -disarm"
                onClick={() => actionAlarm('alarm_disarm')}
              >
                <div className="mdi mdi-bell-off" /> Disarm
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}