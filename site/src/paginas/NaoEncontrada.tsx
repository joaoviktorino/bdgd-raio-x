import { Link } from "react-router";

export default function NaoEncontrada() {
  return (
    <section>
      <h1>Página não encontrada</h1>
      <p>
        Este endereço não existe. Volte para a <Link to="/">página inicial</Link>.
      </p>
    </section>
  );
}
