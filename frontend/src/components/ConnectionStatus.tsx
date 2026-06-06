type Props = { connected: boolean };

export function ConnectionStatus({ connected }: Props) {
  return <p>Connected: {`${connected}`}</p>;
}
