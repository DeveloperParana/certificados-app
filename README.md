# certificate-app

Listagem de eventos e certificados que o DevParaná emitiu.

## Credenciais

Para rodar a aplicação é necessário obter credenciais para o Firabase e para utilizar a API do meetup.com.

### Firebase

Para acessar o firebase você vai precisar de um json de configuração das credenciais, as quais podem ser obtidas em:
[https://developers.google.com/identity/protocols/OAuth2ServiceAccount?hl=pt-br](https://developers.google.com/identity/protocols/OAuth2ServiceAccount?hl=pt-br).

### API do meetup.com

O recurso utilizado do meetup.com é o OAuth Consumers, e o consumidor deve ser configurado em: [https://secure.meetup.com/meetup_api/oauth_consumers/?_locale=pt-BR](https://secure.meetup.com/meetup_api/oauth_consumers/?_locale=pt-BR).


### Arquivo .env

Esse arquivo possui algumas configurações importantes para o sistema as quais devem ser configuradas de acordo com as url's utilizadas no OAuth Consumer.

Um exemplo deste arquivo é encontrado no diretório como .env.example

*Não versione esse arquivo!*


## Observações

É apenas um teste de integração com o Meetup.com e bem experimental, muita coisa esta hardcoded e precisa ser refatorada
