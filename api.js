/* החיבור בין דפי האתר למערכת החתימות בגוגל.
 * הפניות נשלחות בלי העוגיות של גוגל (credentials: 'omit'), ולכן הדפים עובדים גם למי שמחובר לכמה חשבונות גוגל.
 * google.script.run כאן מחקה את מה שהיה בדפים של גוגל, כדי שהקוד של הדפים כמעט לא ישתנה. */
var API_URL = 'https://meir-crm.1-2be.workers.dev/sign';

var SAFE_RETRY = ['apiSign', 'apiPlace', 'apiAdmin'];   // רק קריאות שלא משנות כלום מנסים שוב לבד
function api(fn, args, tries) {
  tries = tries || 0;
  return fetch(API_URL, { method: 'POST', body: JSON.stringify({ fn: fn, args: args || [] }), credentials: 'omit', redirect: 'follow' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function (t) {
      // תשובה שאינה JSON – בדרך כלל דף חסימה של סינון אינטרנט או תקלה ברשת
      try { return JSON.parse(t); } catch (err) { throw new Error('bad response'); }
    })
    .then(function (j) { if (j && j.__err) { var e = new Error(j.__err); e.server = true; throw e; } return j ? j.r : null; })
    .catch(function (e) {
      // תקלת רשת רגעית: עוד ניסיון אחד (שגיאה מהשרת עצמו לא חוזרת על עצמה)
      if (!e.server && tries < 1 && SAFE_RETRY.indexOf(fn) >= 0) return new Promise(function (res) { setTimeout(res, 1200); }).then(function () { return api(fn, args, tries + 1); });
      throw e;
    });
}

window.google = window.google || {};
google.script = {
  run: (function mk(ok, bad) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'withSuccessHandler') return function (f) { return mk(f, bad); };
        if (name === 'withFailureHandler') return function (f) { return mk(ok, f); };
        return function () {
          var args = [].slice.call(arguments);
          api(name, args).then(function (r) { if (ok) ok(r); }, function (e) { if (bad) bad(e); });
        };
      }
    });
  })(null, null)
};

function qp(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (err) { return ''; } }
function $(id) { return document.getElementById(id); }
function show(id, on) { var el = $(id); if (el) el.classList.toggle('hide', on === false); }
