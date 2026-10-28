# Last.fm Stats

Dashboard responsivo para consultar estatísticas públicas de qualquer usuário do Last.fm: total de scrobbles, média diária, artistas, faixas e álbuns favoritos por período, além das reproduções recentes.

## Como executar

O projeto não usa dependências nem etapa de build. Na pasta do repositório, inicie um servidor local:

```bash
python3 -m http.server 8080
```

Depois acesse [http://localhost:8080](http://localhost:8080).

Na primeira busca, a interface solicitará uma API key do Last.fm. Crie uma gratuitamente em [last.fm/api/account/create](https://www.last.fm/api/account/create). A chave é guardada somente no `localStorage` do navegador; a senha e o secret da conta não são necessários.

## Recursos

- Busca de perfis públicos pelo nome de usuário
- Totais de scrobbles, artistas, álbuns e média diária
- Rankings por 7 dias, 1, 3, 6 e 12 meses ou desde o início
- Lista de scrobbles recentes e indicação de faixa tocando agora
- URL compartilhável com `?user=nome_do_usuario`
- Layout responsivo, navegação por teclado e suporte a movimento reduzido

## Arquitetura e segurança

Esta versão chama a API pública diretamente do navegador. Isso mantém o projeto simples e fácil de hospedar como site estático, mas torna a API key visível para quem inspecionar as requisições. Para uma aplicação pública de maior escala, recomenda-se mover as chamadas para um backend com cache, limitação de requisições e a chave em uma variável de ambiente.

Os dados são fornecidos pela [Last.fm API](https://www.last.fm/api) e os links de artistas, álbuns e faixas apontam para as páginas correspondentes no Last.fm.
