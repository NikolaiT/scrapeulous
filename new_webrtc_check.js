class WebrtcCheckNew {
  async crawl(url) {
    await this.page.goto(url);
    await this.page.waitFor(3000);
    let html = await this.page.content();
    let leak_detected = null;

    if (url === 'https://ip.voidsec.com/') {
      return await this.page.evaluate(function () {
        return document.getElementById('fpIPv4Addr').innerText;
      });
    }

    if (html.includes('expressvpn.com')) {
      leak_detected = await this.page.evaluate(function () {
        return document.querySelector("#webrtc-result .leak-result").offsetParent !== null;
      });
    } else if (html.includes('hidemyass.com')) {
      leak_detected = await this.page.evaluate(function () {
        return document.querySelector('.webrtc-leak .protected').classList.contains('hide');
      });
    }

    if (leak_detected === true) {
      return 'ip_leak_detected';
    } else {
      return 'no_ip_leak';
    }
  }
}