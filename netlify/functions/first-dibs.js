const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

const normalizePhone = (value = '') => {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits;
};

const splitName = (value = '') => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' ')
  };
};

const simpleTextingPost = async (path, params) => {
  const url = new URL(`https://app2.simpletexting.com/v1/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    }
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, message: 'Invalid request.' });
  }

  const {
    name = '',
    email = '',
    phone = '',
    ages = '',
    thing = '',
    smsConsent = false
  } = payload;

  if (!smsConsent) {
    return json(200, { ok: true, smsAdded: false, welcomeSent: false });
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length !== 10) {
    return json(400, { ok: false, message: 'Please enter a valid 10-digit mobile number.' });
  }

  const token = process.env.SIMPLETEXTING_API_TOKEN;
  const group = process.env.SIMPLETEXTING_LIST_NAME || 'Parkerly First Dibs';
  const welcomeMessage = process.env.SIMPLETEXTING_WELCOME_MESSAGE ||
    "Parkerly: You've got first dibs! ✦ We'll text you when the opening lineup drops AND when booking opens. Reply STOP to opt out.";

  if (!token) {
    console.error('SIMPLETEXTING_API_TOKEN is not configured.');
    return json(503, { ok: false, message: 'Text signup is not connected yet.' });
  }

  const { firstName, lastName } = splitName(name);
  const comment = [
    ages ? `Child age(s): ${ages}` : '',
    thing ? `Would love to try: ${thing}` : '',
    `Website SMS opt-in: ${new Date().toISOString()}`
  ].filter(Boolean).join(' | ');

  try {
    const added = await simpleTextingPost('group/contact/add', {
      token,
      group,
      phone: normalizedPhone,
      firstName,
      lastName,
      email,
      comment
    });

    const addMessage = String(added.data?.message || '');
    const duplicate = /already|duplicate/i.test(addMessage);
    const addSucceeded = added.response.ok && (added.data?.code === 1 || duplicate);

    if (!addSucceeded) {
      console.error('SimpleTexting add-contact error:', added.data);
      return json(502, { ok: false, message: 'We could not add text updates yet. Please try again.' });
    }

    let welcomeSent = false;
    if (!duplicate) {
      const sent = await simpleTextingPost('send', {
        token,
        phone: normalizedPhone,
        message: welcomeMessage
      });
      welcomeSent = sent.response.ok && sent.data?.code === 1;
      if (!welcomeSent) console.error('SimpleTexting welcome-message error:', sent.data);
    }

    return json(200, {
      ok: true,
      smsAdded: true,
      welcomeSent,
      alreadyOnList: duplicate
    });
  } catch (error) {
    console.error('First Dibs function error:', error);
    return json(500, { ok: false, message: 'Something went wrong connecting text updates.' });
  }
};
