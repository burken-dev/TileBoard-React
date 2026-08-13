import { useAppStore } from '../../store';
import { getItemEntity } from '../../utils/entity';
import {
  datetimePlaceholder,
  datetimeValid,
  interleaveDigits,
} from '../../utils/datetime';
import { entityState } from '../../utils/entity';

export default function DatetimePopup() {
  const activeDatetime = useAppStore((s) => s.activeDatetime);
  const datetimeInput = useAppStore((s) => s.datetimeInput);
  const states = useAppStore((s) => s.entities);
  const closeDatetime = useAppStore((s) => s.closeDatetime);
  const inputDatetimeDigit = useAppStore((s) => s.inputDatetimeDigit);
  const clearDatetimeChar = useAppStore((s) => s.clearDatetimeChar);
  const sendDatetime = useAppStore((s) => s.sendDatetime);

  if (!activeDatetime) return null;
  const entity = getItemEntity(activeDatetime, states);
  if (!entity) return null;

  const placeholder = datetimePlaceholder(entity);
  const { filled, remaining } = interleaveDigits(placeholder, datetimeInput);
  const valid = datetimeValid(placeholder, datetimeInput);

  return (
    <div className="datetime-popup">
      <div className="datetime-popup-overlay" onClick={() => closeDatetime()} />
      <div className="datetime-popup-container">
        <div className="datetime-popup-close" onClick={() => closeDatetime()}>
          <i className="mdi mdi-close" />
        </div>
        <div className="datetime-popup-state">
          <span>{entityState(activeDatetime, entity, states)}</span>
        </div>
        <div className="datetime-popup-input-container">
          <div className="datetime-popup-input">
            <span className="datetime-popup-input--filled">{filled}</span>
            <span className="datetime-popup-input--placeholder">{remaining}</span>
          </div>
        </div>
        <div className="datetime-popup-buttons">
          {[6, 3, 0].map((line, li) => (
            <div className="datetime-popup-buttons-line" key={li}>
              {[1, 2, 3].map((button) => (
                <div
                  className="datetime-popup-button"
                  key={button}
                  onClick={() => inputDatetimeDigit(button + line)}
                >
                  {button + line}
                </div>
              ))}
            </div>
          ))}
          <div className="datetime-popup-buttons-line">
            <div className="datetime-popup-button -warning" onClick={() => clearDatetimeChar()}>
              <div className="mdi mdi-arrow-left" />
            </div>
            <div className="datetime-popup-button" onClick={() => inputDatetimeDigit(0)}>
              0
            </div>
            <div
              className={'datetime-popup-button -success' + (valid ? '' : ' -disabled')}
              onClick={() => sendDatetime()}
            >
              <div className="mdi mdi-check" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}