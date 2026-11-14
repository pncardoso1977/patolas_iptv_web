# Aplicação Web IPTV

Aplicação web responsiva, sem logótipo nem branding, preparada para navegadores Chrome e Safari em computador, Android e iPhone/iPad.

## Conteúdo
- Login com endereço do servidor, utilizador e palavra-passe.
- Consulta de categorias e conteúdos de canais, filmes e séries através da API Xtream Codes (`player_api.php`).
- Pesquisa e filtro por categoria.
- Reprodução de streams compatíveis com o navegador; HLS utiliza hls.js quando necessário e suportado.
- Opção para guardar os dados de acesso no dispositivo. Se ativada, a palavra-passe fica no `localStorage` do navegador; não a atives em dispositivos partilhados.
- PWA básica: pode ser adicionada ao ecrã principal a partir de Safari ou instalada no Chrome, quando servida por HTTPS.

## Publicação
A aplicação é estática. Publica todos os ficheiros desta pasta num alojamento HTTPS (por exemplo, GitHub Pages, Cloudflare Pages ou Netlify). Não é necessário Codemagic nem Xcode.

Para testar localmente, usa um servidor HTTP local; abrir `index.html` diretamente como `file://` não permite registar o service worker.

## Requisito crítico: CORS
A API IPTV tem de permitir pedidos `fetch` a partir do domínio onde esta aplicação está alojada (cabeçalho `Access-Control-Allow-Origin`). Muitos servidores IPTV não permitem CORS. Nesse caso, o login e a listagem serão bloqueados pelo navegador mesmo que as credenciais estejam corretas. Será necessário configurar CORS no servidor IPTV ou criar um pequeno backend/proxy sob controlo do operador do serviço. Não é seguro contornar CORS com extensões do navegador ou proxies públicos.

Os streams de vídeo também têm de permitir pedidos cross-origin quando o navegador/descodificador os exige. Safari suporta HLS nativamente em muitos casos; Chrome normalmente necessita de HLS via Media Source Extensions e hls.js para `.m3u8`. Streams `.ts` e codecs específicos podem não ser reproduzíveis em todos os navegadores.

## Segurança
- A aplicação comunica diretamente com o servidor indicado pelo utilizador.
- As credenciais não são guardadas por omissão. Se o utilizador marcar “Guardar os dados”, ficam no `localStorage` do navegador, acessíveis a scripts executados na mesma origem. Para distribuição pública, recomenda-se autenticação por backend e não persistir palavras-passe no cliente.
- Usa apenas endereços HTTPS sempre que possível. Um endereço HTTP não cifra as credenciais.
- A aplicação não inclui nem define qualquer endereço de servidor IPTV.

## Limitações funcionais desta primeira conversão
A versão SwiftUI de origem tinha um fluxo de séries simplificado. Esta versão procura os episódios via `get_series_info`, mas o formato da resposta pode variar entre fornecedores Xtream. A reprodução depende dos formatos, codecs e permissões CORS do servidor.
