// Transport nodemailer vers l'API HTTP Mailgun : Railway bloque les ports SMTP
// sortants (plans Free/Hobby), on poste donc le MIME construit par nodemailer
// sur l'endpoint messages.mime (port 443, toujours ouvert).
export function mailgunApiTransport({ apiKey, domain, host }) {
  return {
    name: 'MailgunAPI',
    version: '1.0.0',
    send(mail, callback) {
      mail.message.build((err, message) => {
        if (err) return callback(err);
        const envelope = mail.message.getEnvelope();
        const form = new FormData();
        form.append('to', envelope.to.join(','));
        form.append('message', new Blob([message]), 'message.mime');
        fetch(`https://${host}/v3/${domain}/messages.mime`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          },
          body: form,
        })
          .then(async (res) => {
            const body = await res.text();
            if (!res.ok) {
              return callback(new Error(`Mailgun ${res.status} : ${body.slice(0, 300)}`));
            }
            let messageId = '';
            try {
              messageId = JSON.parse(body).id || '';
            } catch {
              /* réponse non JSON : id absent, sans gravité */
            }
            callback(null, { envelope, messageId, response: body });
          })
          .catch(callback);
      });
    },
  };
}
