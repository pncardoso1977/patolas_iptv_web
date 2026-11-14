# patolasIPTV — versão web M3U

Aplicação web responsiva para Chrome e Safari. Esta versão lê uma lista M3U fornecida pelo utilizador.

## Funcionalidades
- Campo para o URL completo da lista M3U.
- Leitura de canais e grupos `group-title`.
- Pesquisa por nome e filtro por grupo.
- Reprodução direta do URL de cada canal; HLS usa hls.js quando suportado.
- Opção para guardar apenas o URL M3U neste dispositivo.

## Limitações importantes
- Esta versão é para listas M3U de canais. M3U, por si só, não fornece o catálogo Xtream de filmes, séries, temporadas e episódios; por isso essas secções não estão incluídas.
- O navegador só consegue descarregar a lista se o servidor permitir CORS para o domínio da aplicação. Se não permitir, é necessário um proxy/backend HTTPS autorizado e configurado de forma segura. Esta versão utiliza o Cloudflare Worker `https://patolasiptv-m3u.pncardoso.workers.dev/` para obter a lista. O Worker tem de estar publicado e configurado para aceitar apenas a origem GitHub Pages indicada.
- A reprodução depende dos formatos, codecs e políticas CORS do servidor. Chrome e Safari não suportam todos os formatos da mesma forma.
- O URL M3U pode conter credenciais. Não o publiques em repositórios, capturas de ecrã ou dispositivos partilhados. O armazenamento local é opcional e não é cifrado.

## Publicação
Publica os ficheiros desta pasta num alojamento HTTPS, como GitHub Pages ou Cloudflare Pages. Para testar localmente, usa um servidor HTTP local; não abras o ficheiro diretamente como `file://`.
