import { useAppStore } from '../store';
import { isHidden } from '../utils/fields';

export default function PagesMenu() {
  const config = useAppStore((s) => s.config);
  const activePage = useAppStore((s) => s.activePage);
  const openPage = useAppStore((s) => s.openPage);

  const menuPosition = config.menuPosition ?? 'left';
  const visibleCount = config.pages.filter((page) => !isHidden(page, {} as never)).length;
  if (visibleCount <= 1) return null;

  return (
    <div className={'pages-menu -' + menuPosition}>
      <div className="pages-menu--scroll-indicator" />
      <div className="pages-menu--aligner" />
      <div className="pages-menu--items">
        {config.pages.map((page, index) =>
          isHidden(page, {} as never) ? null : (
            <div
              key={index}
              className={
                'pages-menu--item' + (index === activePage ? ' -active' : '')
              }
              onClick={() => openPage(index)}
            >
              <i className={'mdi ' + (page.icon ?? '')} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}