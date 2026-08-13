import type { HaEntity, TileConfig } from '../../config/types';
import { FEATURES } from '../../config/constants';
import { callService } from '../../ha/services';
import { useAppStore } from '../../store';
import { mutePlayer, sendPlayer, setSourcePlayer, withLoading } from '../../tiles/actions';
import { entityState, entitySubtitle } from '../../utils/entity';
import { debounce } from '../../utils/misc';
import { selectStyles } from '../SelectOverlay';
import { SliderInput } from './SliderInput';

const sendVolume = debounce((item: TileConfig, value: number) => {
  withLoading(item, () =>
    callService('media_player', 'volume_set', {
      entity_id: item.id,
      volume_level: value / 100,
    }),
  );
}, 250);

export function MediaPlayerTile({ item, entity }: { item: TileConfig; entity: HaEntity }) {
  const entities = useAppStore((s) => s.entities);
  const openSelect = useAppStore((s) => s.openSelect);
  const closeSelect = useAppStore((s) => s.closeSelect);
  const selectOpened = useAppStore((s) => s.selectOpened);

  const off = entity.state === 'off';
  const playing = entity.state === 'playing';
  const features = Number(entity.attributes.supported_features) || 0;
  const has = (f: number): boolean => (features & f) === f;
  const sourceList = (entity.attributes.source_list ?? []) as string[];
  const source = String(entity.attributes.source ?? '');
  const muted = !!entity.attributes.is_volume_muted;
  const state = entityState(item, entity, entities);
  const subtitle = entitySubtitle(item, entity, entities);

  let mainIcon = 'mdi-play';
  let mainService = 'media_play';
  if (playing && has(FEATURES.MEDIA_PLAYER.PAUSE)) {
    mainIcon = 'mdi-pause';
    mainService = 'media_pause';
  } else if (playing && !has(FEATURES.MEDIA_PLAYER.PAUSE)) {
    mainIcon = 'mdi-stop';
    mainService = 'media_stop';
  }

  const showVolumeSlider =
    has(FEATURES.MEDIA_PLAYER.VOLUME_SET) &&
    'volume_level' in entity.attributes &&
    !off;
  const showVolumeButtons =
    (!has(FEATURES.MEDIA_PLAYER.VOLUME_SET) || !('volume_level' in entity.attributes)) &&
    has(FEATURES.MEDIA_PLAYER.VOLUME_STEP) &&
    !off;
  const showSource = sourceList.length > 0 && !item.hideSource;

  const onPointerDown = (e: React.PointerEvent): void => e.stopPropagation();

  return (
    <div className="item-entity-container">
      <div
        className={
          'media-player-table' + (state ? ' -has-state' : '') + (subtitle ? ' -has-subtitle' : '')
        }
      >
        <table>
          <tbody>
            <tr>
              <td className="media-player-table--td-main-button">
                {!off && (
                  <div
                    className="media-player--main-button"
                    onPointerDown={onPointerDown}
                    onClick={(e) => {
                      e.stopPropagation();
                      sendPlayer(mainService, item, entity);
                    }}
                  >
                    <span className={'mdi ' + mainIcon} />
                  </div>
                )}
              </td>
              <td colSpan={2} className="media-player-table--td-buttons">
                <div className="media-player--buttons">
                  {!off && has(FEATURES.MEDIA_PLAYER.PREVIOUS_TRACK) && (
                    <div
                      className="media-player--button -prev"
                      onPointerDown={onPointerDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendPlayer('media_previous_track', item, entity);
                      }}
                    >
                      <i className="mdi mdi-skip-previous" />
                    </div>
                  )}
                  {!off && has(FEATURES.MEDIA_PLAYER.NEXT_TRACK) && (
                    <div
                      className="media-player--button -next"
                      onPointerDown={onPointerDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendPlayer('media_next_track', item, entity);
                      }}
                    >
                      <i className="mdi mdi-skip-next" />
                    </div>
                  )}
                  {has(FEATURES.MEDIA_PLAYER.TURN_ON) && off && (
                    <div
                      className="media-player--button -power"
                      onPointerDown={onPointerDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendPlayer('turn_on', item, entity);
                      }}
                    >
                      <i className="mdi mdi-power" />
                    </div>
                  )}
                  {has(FEATURES.MEDIA_PLAYER.TURN_OFF) && !off && (
                    <div
                      className="media-player--button -power"
                      onPointerDown={onPointerDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendPlayer('turn_off', item, entity);
                      }}
                    >
                      <i className="mdi mdi-power" />
                    </div>
                  )}
                </div>
              </td>
            </tr>
            <tr className="media-player-table--space">
              <td colSpan={3} />
            </tr>
            {showSource && (
              <tr className="media-player-table--source">
                <td colSpan={3} className="media-player-table--td-source">
                  <div
                    className="media-player--source"
                    onPointerDown={onPointerDown}
                    onClick={(e) => {
                      e.stopPropagation();
                      openSelect(item);
                    }}
                  >
                    <span>{source || 'Source'}</span>
                  </div>
                </td>
              </tr>
            )}
            {showVolumeSlider && (
              <tr>
                <td colSpan={3} className="media-player-table--td-volume">
                  <div className="media-player--volume">
                    <SliderInput
                      conf={{
                        max: 100,
                        min: 0,
                        step: 1,
                        value: Math.round(Number(entity.attributes.volume_level) * 100) || 0,
                      }}
                      onChange={(value) => sendVolume(item, value)}
                    />
                  </div>
                </td>
              </tr>
            )}
            {showVolumeButtons && (
              <tr>
                                <td colSpan={3} className="media-player-table--td-volume-buttons">
                  <div
                    className="media-player--button -volume_down"
                    onPointerDown={onPointerDown}
                    onClick={(e) => {
                      e.stopPropagation();
                      sendPlayer('volume_down', item, entity);
                    }}
                  >
                    <i className="mdi mdi-volume-minus" />
                  </div>
                  <div
                    className="media-player--button -volume_up"
                    onPointerDown={onPointerDown}
                    onClick={(e) => {
                      e.stopPropagation();
                      sendPlayer('volume_up', item, entity);
                    }}
                  >
                    <i className="mdi mdi-volume-plus" />
                  </div>
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={2} />
              <td className="media-player-table--td-mute">
                {!off && !item.hideMuteButton && has(FEATURES.MEDIA_PLAYER.VOLUME_MUTE) && (
                  <div
                    className="media-player--button -mute"
                    onPointerDown={onPointerDown}
                    onClick={(e) => {
                      e.stopPropagation();
                      mutePlayer(!muted, item, entity);
                    }}
                  >
                    <i className={'mdi ' + (muted ? 'mdi-volume-mute' : 'mdi-volume-high')} />
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {selectOpened(item) && (
        <div className="item-select" style={selectStyles(sourceList)}>
          {sourceList.map((option, index) => (
            <div
              key={index}
              className={'item-select--option' + (option === source ? ' -active' : '')}
              onClick={(e) => {
                e.stopPropagation();
                setSourcePlayer(item, entity, option);
                closeSelect();
              }}
            >
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}