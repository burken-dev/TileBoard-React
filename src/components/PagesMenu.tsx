import { useAppStore } from '../store';
import { isHidden, resolveFields } from '../utils/fields';
import { PAGE_FIELDS } from '../utils/fields';

export default function PagesMenu() {
  const config = useAppStore((s) => s.config);
  const states = useAppStore((s) => s.entities);
  const activePage = useAppStore((s) => s.activePage);
  const openPage = useAppStore((s) => s.openPage);

  const menuPosition = config.menuPosition ?? 'left';
  const visibleCount = config.pages.filter((page) => !isHidden(page, states)).length;
  if (visibleCount <= 1) return null;

  return (
    <div className={'pages-menu -' + menuPosition}>
      <div className="pages-menu--scroll-indicator" />
      <div className="pages-menu--aligner" />
      <div className="pages-menu--items">
        {config.pages.map((p, index) => {
          const page = resolveFields(p, PAGE_FIELDS, states, null);
          return isHidden(page, states) ? null : (
            <div
              key={index}
              className={
                'pages-menu--item' + (index === activePage ? ' -active' : '')
              }
              onClick={() => openPage(index)}
            >
              <i className={'mdi ' + ((page.icon as string | undefined) ?? '')} />
            </div>
          );
        })}
      </div>
    </div>
  );
}