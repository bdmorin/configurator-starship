export function DemoBanner() {
  return (
    <div className="demo-banner">
      <span className="demo-tag">DEMO</span>
      <span>
        Static preview — preview/save are disabled. Run locally for the full thing:{" "}
        <code>bunx github:bdmorin/configurator-starship</code>
      </span>
      <a className="demo-link" href="https://github.com/bdmorin/configurator-starship" target="_blank" rel="noreferrer">
        source on github →
      </a>
    </div>
  );
}
