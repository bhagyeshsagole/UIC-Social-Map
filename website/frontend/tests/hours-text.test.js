import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHoursText, findHoursInPage} from '../scripts/lib/hoursText.mjs';

const H = (h, m = 0) => h * 60 + m;

test('common website phrasings become weekly schedules', () => {
  assert.deepEqual(parseHoursText('Monday - Thursday: 11am - 10pm\nFriday & Saturday: 11am - 11pm\nSunday: Closed'),
    [null, [H(11), H(22)], [H(11), H(22)], [H(11), H(22)], [H(11), H(22)], [H(11), H(23)], [H(11), H(23)]]);
  assert.deepEqual(parseHoursText('Mon–Fri 7:00 a.m. – 3:00 p.m. · Sat–Sun 8 a.m. to 2 p.m.'),
    [[H(8), H(14)], [H(7), H(15)], [H(7), H(15)], [H(7), H(15)], [H(7), H(15)], [H(7), H(15)], [H(8), H(14)]]);
  assert.deepEqual(parseHoursText('Open daily 10am-9pm'), Array(7).fill([H(10), H(21)]));
  assert.deepEqual(parseHoursText('Tues-Sun 5-10pm, closed Mondays')[2], [H(17), H(22)]);
  assert.equal(parseHoursText('Tues-Sun 5-10pm, closed Mondays')[1], null);
  assert.deepEqual(parseHoursText('Fri, Sat 6pm - 2am; Sun-Thu 6pm-12am')[5], [H(18), H(26)]);
  assert.deepEqual(parseHoursText('Mon-Sat 11-2pm')[1], [H(11), H(14)], 'opening without am/pm is inferred safely');
});

test('split shifts and table layouts', () => {
  const split = parseHoursText('Monday-Friday 11:30am-2:30pm, 5pm-9:30pm Saturday 5pm-10pm Sunday closed');
  assert.deepEqual(split[1], [[H(11, 30), H(14, 30)], [H(17), H(21, 30)]]);
  assert.deepEqual(split[6], [H(17), H(22)]);
  assert.deepEqual(parseHoursText('Monday 9:00 AM - 5:00 PM Tuesday 9:00 AM - 5:00 PM Wednesday 9:00 AM - 5:00 PM Thursday 9:00 AM - 5:00 PM')[4], [H(9), H(17)]);
});

test('ambiguous or partial hours are refused', () => {
  for (const text of ['Mon-Fri 11-10', 'Open late!', 'Lunch 11-2', 'Monday 9am-5pm', 'Call for hours', 'Mon-Fri 9am-5pm Mon-Fri 10am-6pm extra conflicting lines']) assert.equal(parseHoursText(text), null, text);
});

test('a page picks the hours block for this address, and ignores happy hour', () => {
  const page = `<h2>Hours</h2><p>Mon-Thu 11am-10pm<br>Fri-Sat 11am-11pm<br>Sun 12pm-9pm</p><h3>Happy Hour</h3><p>Mon-Fri 3pm-6pm</p>`;
  assert.deepEqual(findHoursInPage(page)[1], [H(11), H(22)]);
  const two = `<div>1400 W Taylor St</div><div>Hours: Mon-Sun 11am-9pm</div><div>2200 N Clark St</div><div>Hours: Mon-Sun 10am-10pm</div>`;
  assert.deepEqual(findHoursInPage(two, {housenumber: '2200', street: 'North Clark Street'})[0], [H(10), H(22)]);
  assert.equal(findHoursInPage(two), null, 'two locations and no address: refuse');
});

test('real pages: closed belongs to the day before it in tables, and ambiguous prose is refused', () => {
  const mk = parseHoursText('Hours (Temperaly) Mon 11:00 am – 09:00 pm Tue Closed Wed 11:00 am – 09:00 pm Thu 11:00 am – 09:00 pm Fri 11:00 am – 10:00 pm Sat 11:00 am – 10:00 pm Sun 11:30 am – 09:00 pm');
  assert.deepEqual(mk, [[H(11, 30), H(21)], [H(11), H(21)], null, [H(11), H(21)], [H(11), H(21)], [H(11), H(22)], [H(11), H(22)]]);
  const jj = parseHoursText('HOURS Sunday Closed Monday 9:30 AM - 4:00 PM Tuesday 9:30 AM - 4:00 PM Wednesday 9:30 AM - 4:00 PM Thursday 9:30 AM - 4:00 PM Friday 9:30 AM - 4:00 PM Saturday Closed');
  assert.deepEqual(jj, [null, [H(9, 30), H(16)], [H(9, 30), H(16)], [H(9, 30), H(16)], [H(9, 30), H(16)], [H(9, 30), H(16)], null]);
  assert.deepEqual(parseHoursText('Hours: Mon - Fri: 10 AM - 5 PM Sat: 10 AM - 3 PM Closed: Sun')[0], null);
  assert.equal(parseHoursText('HOURS NOW OPEN FOR FOR LUNCH WEDNESDAY - SUNDAY CLOSED MONDAY TUESDAY : 4 PM to 10 PM WEDNESDAY : 11:45 AM to 10 PM THURSDAY : 11:45 AM to 10 PM'), null);
});

test('meal labels inside the hours are read, not cut: weekends are not marked closed by mistake', () => {
  const commons = findHoursInPage('<p>Regular Hours Monday - to Friday Breakfast : 07:30 AM - 10:15 AM Lunch : 10:45 AM - 02:00 PM Dinner : 04:30 PM - 08:00 PM Saturday - Sunday Brunch : 10:00 AM - 02:00 PM Dinner : 04:30 PM - 08:00 PM</p>');
  assert.deepEqual(commons[6], [[H(10), H(14)], [H(16, 30), H(20)]]);
  assert.deepEqual(commons[1], [[H(7, 30), H(10, 15)], [H(10, 45), H(14)], [H(16, 30), H(20)]]);
  const oakville = findHoursInPage('<p>Hours Monday - Thursday: 11:00 AM - 10:00 PM Friday: 11:00 AM - 11:00 PM Saturday: 9:00 AM - 11:00 PM Sunday: 9:00 AM - 9:00 PM Brunch: Saturday & Sunday 9:00 AM - 3:00 PM</p>');
  assert.deepEqual(oakville[6], [H(9), H(23)], 'a separate brunch section still does not override the hours');
});

test('a block cut at "Menu" keeps its days; one cut before weekend brunch is refused', () => {
  const panlasa = findHoursInPage('<p>Hours Monday 10-3p Tuesday 8-6p Wednesday 8-6p Thursday 8-6p Friday 10-3p Saturday 9-4p Order Now Instagram Website Menu Get Newsletter 131 North Clinton, Chicago | Open Monday-Friday 7AM – 7PM</p>');
  assert.deepEqual(panlasa[6], [H(9), H(16)]);
  assert.equal(panlasa[0], null);
  assert.equal(findHoursInPage('<p>Hours Mon-Fri 11am-9pm. Brunch Sat & Sun 10am-3pm, Dinner Sat & Sun 5pm-10pm</p>'), null);
});

test('"hours" inside a sentence is not a heading, and a column table is refused', () => {
  const page = '<h3>Hours</h3><p>Restaurant Mon- Thurs Friday Saturday Sunday Kitchen 6 a.m. – 10 p.m. 6 a.m. – 12 a.m. 6 a.m. – 12 a.m. 7 a.m. – 10 p.m.</p><p>*Has extended hours when there are events. Breakfast Served: 6a.m. – 11 a.m. Mon.-Fri. 8 a.m. – 11 a.m. Sat.-Sun.</p>';
  assert.equal(findHoursInPage(page), null);
  assert.deepEqual(findHoursInPage('<p>Visit us! Hours: Mon-Sun 9am-5pm</p>')[3], [H(9), H(17)]);
});
