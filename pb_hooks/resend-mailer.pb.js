/// <reference path="../pb_data/types.d.ts" />
onMailerSend((e) => {
    console.log("[resend-mailer] intercepting mail to", e.message.to.map((t) => t.address).join(","));
    const apiKey = $os.getenv("RESEND_API_KEY");
    if (!apiKey) {
        console.log("[resend-mailer] RESEND_API_KEY not set; falling back to SMTP");
        return e.next();
    }
    console.log("[resend-mailer] sending via Resend HTTPS API");

    const fromAddress = e.message.from?.address || $app.settings().meta.senderAddress;
    const fromName = e.message.from?.name || $app.settings().meta.senderName;
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    const payload = {
        from,
        to: e.message.to.map((t) => t.address),
        subject: e.message.subject,
    };
    if (e.message.html) payload.html = e.message.html;
    if (e.message.text) payload.text = e.message.text;
    if (e.message.cc?.length) payload.cc = e.message.cc.map((t) => t.address);
    if (e.message.bcc?.length) payload.bcc = e.message.bcc.map((t) => t.address);

    const response = $http.send({
        url: "https://api.resend.com/emails",
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        timeout: 10,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
        console.log("[resend-mailer] failed", response.statusCode, response.raw);
        throw new Error(`Resend returned ${response.statusCode}`);
    }
    console.log("[resend-mailer] sent OK");
});
