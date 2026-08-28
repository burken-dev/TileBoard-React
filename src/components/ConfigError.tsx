interface ConfigErrorProps {
  errors: string[];
}

export default function ConfigError({ errors }: ConfigErrorProps) {
  return (
    <div className="config-error">
      <h1>TileBoard config error</h1>
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}