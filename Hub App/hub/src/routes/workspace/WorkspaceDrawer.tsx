interface Props {
  tab: 'design' | 'live' | null
  onChangeTab: (t: 'design' | 'live' | null) => void
  productId: string
}

const DESIGN_FILES = [
  {
    name: 'Hub Wireframes v3',
    file: 'Talia Hub Wireframes v3.html',
    desc: 'hub, auth, onboarding screens',
    surface: 'paper',
  },
  {
    name: 'Brand System',
    file: 'Brand System.html',
    desc: 'colors, type, components',
    surface: 'cosmic',
  },
  {
    name: 'Homepage',
    file: 'Homepage.html',
    desc: 'marketing surface',
    surface: 'cosmic',
  },
]

const PRODUCT_URLS: Record<string, string> = {
  vein:       'https://vein.taliaduvet.com',
  ledger:     'https://ledger.taliaduvet.com',
  production: '',
}

export function WorkspaceDrawer({ tab, onChangeTab, productId }: Props) {
  const appUrl = PRODUCT_URLS[productId] ?? ''

  if (tab === null) {
    return (
      <div className="ws-drawer ws-drawer--collapsed">
        <div className="ws-drawer-rail">
          <button
            className="ws-rail-btn"
            onClick={() => onChangeTab('design')}
            title="Design files (⌘D)"
          >◆</button>
          <button
            className="ws-rail-btn"
            onClick={() => onChangeTab('live')}
            title="Live preview (⌘P)"
          >▣</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ws-drawer">
      <div className="ws-drawer-tabs">
        <button
          className={`ws-drawer-tab${tab === 'design' ? ' ws-drawer-tab--active' : ''}`}
          onClick={() => onChangeTab('design')}
        >
          design <span className="ws-drawer-tab-kbd">⌘D</span>
        </button>
        <button
          className={`ws-drawer-tab${tab === 'live' ? ' ws-drawer-tab--active' : ''}`}
          onClick={() => onChangeTab('live')}
        >
          live <span className="ws-drawer-tab-kbd">⌘P</span>
        </button>
        <button className="ws-drawer-close" onClick={() => onChangeTab(null)}>→</button>
      </div>

      {tab === 'design' && (
        <div className="ws-drawer-pane">
          <div className="ws-drawer-context">design files</div>
          <div className="ws-design-body">
            <p className="ws-design-blurb">
              open a file in your browser to see the current designs. these are the source of truth for how everything should look and behave.
            </p>
            <div className="ws-design-section">— wireframes & brand</div>
            {DESIGN_FILES.map(f => (
              <a
                key={f.file}
                className="ws-design-file"
                href={`/design_handoff_hub/designs/${f.file}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={`ws-design-thumb ws-design-thumb--${f.surface}`}>
                  {f.surface === 'cosmic' ? '✦' : '○'}
                </div>
                <div>
                  <div className="ws-design-name">{f.name}</div>
                  <div className="ws-design-sub">{f.desc}</div>
                </div>
                <span className="ws-design-open">open ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {tab === 'live' && (
        <div className="ws-drawer-pane">
          <div className="ws-preview-toolbar">
            <div className="ws-preview-url">{appUrl || `${productId} · not yet deployed`}</div>
            {appUrl && (
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ws-preview-btn"
              >↗ open</a>
            )}
          </div>
          {appUrl ? (
            <iframe
              src={appUrl}
              className="ws-preview-iframe"
              title={`${productId} live preview`}
            />
          ) : (
            <div className="ws-preview-frame">
              <span className="t-mono-cap" style={{ color: 'var(--ink-faint)', fontSize: 10 }}>
                {productId} isn't deployed yet
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
