import { useState } from "react";

import { arquivo } from "../dados";
import { dataPorExtenso, inteiro, megabytes } from "../formatos";
import { Fonte } from "./Fonte";

/** Botão que copia um texto para a área de transferência. */
export function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="botao-copiar"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
    >
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

/** Bloco de código com barra de título (linguagem) e botão de copiar. */
export function BlocoDeCodigo({ linguagem, codigo }: { linguagem: string; codigo: string }) {
  return (
    <div className="codigo">
      <div className="codigo-barra">
        <span>{linguagem}</span>
        <Copiar texto={codigo} />
      </div>
      <pre>
        <code>{codigo}</code>
      </pre>
    </div>
  );
}

/** A "certidão" do arquivo: de onde veio, quanto pesa e como conferir que é o mesmo. */
export default function Certidao() {
  const grupos = arquivo.sha256.match(/.{1,8}/g) ?? [];
  const comando = `Get-FileHash .\\${arquivo.arquivo}`;

  return (
    <div className="certidao">
      <div className="certidao-cabecalho">
        <span className="certidao-selo" aria-hidden="true">
          BDGD
        </span>
        <div>
          <p className="certidao-titulo">Certidão do arquivo</p>
          <p className="certidao-sub">
            {arquivo.distribuidora} · referência {dataPorExtenso(arquivo.partes_do_nome.data_referencia)}
          </p>
        </div>
      </div>

      <dl className="certidao-campos">
        <div>
          <dt>Arquivo</dt>
          <dd>
            <code>{arquivo.arquivo}</code>
          </dd>
        </div>
        <div>
          <dt>Tamanho</dt>
          <dd>
            {megabytes(arquivo.tamanho_bytes)} <small>({inteiro(arquivo.tamanho_bytes)} bytes)</small>
          </dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>
            <a href={arquivo.origem.url_download}>{arquivo.origem.portal}</a>
          </dd>
        </div>
        <div>
          <dt>Baixado em</dt>
          <dd>{dataPorExtenso(arquivo.data_download)}</dd>
        </div>
        <div>
          <dt>Licença</dt>
          <dd>{arquivo.licenca}, fonte ANEEL</dd>
        </div>
        <div className="certidao-hash">
          <dt>SHA-256</dt>
          <dd>
            <span className="hash">
              {grupos.map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </span>
          </dd>
        </div>
      </dl>

      <div className="confira">
        <p>
          O SHA-256 é a impressão digital do arquivo: se você baixar de novo e o código sair igual, o arquivo é
          idêntico. Para conferir no PowerShell, na pasta do arquivo:
        </p>
        <BlocoDeCodigo linguagem="PowerShell" codigo={comando} />
      </div>
      <p className="nota">
        Dados registrados pelo pipeline deste projeto no momento do download <Fonte de="arquivo" />.
      </p>
    </div>
  );
}
