interface ConfigNotFoundProps {
  name: string;
}

export default function ConfigNotFound({ name }: ConfigNotFoundProps) {
  return (
    <div className="config-error">
      <h1>TileBoard config error</h1>
      <p>Config `{name}.js` not found in /config. Check the `?config=` URL parameter.</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}