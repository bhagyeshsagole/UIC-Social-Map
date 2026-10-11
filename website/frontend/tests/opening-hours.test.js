import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOpeningHours, parseOpeningSpecification} from '../src/openingHours.js';
import {openingStatus, dayHours} from '../src/time.js';

test('weekly OpenStreetMap hours become a Sunday-first schedule; unlisted days are closed', () => {
  assert.deepEqual(parseOpeningHours('Mo-Th 07:30-20:00; Sa 09:00-16:00; Su off'), [null,[450,1200],[450,1200],[450,1200],[450,1200],null,[540,960]]);
  assert.deepEqual(parseOpeningHours('24/7'), Array(7).fill([0,1440]));
  assert.deepEqual(parseOpeningHours('11:00-22:00'), Array(7).fill([660,1320]));
  assert.deepEqual(parseOpeningHours('Fr-Mo 10:00-14:00')[0], [600,840]);
});

test('split shifts, late nights and later overrides follow OSM rules', () => {
  const split = parseOpeningHours('Mo-Fr 11:00-14:00,17:00-22:00; Fr 11:00-23:00');
  assert.deepEqual(split[1], [[660,840],[1020,1320]]);
  assert.deepEqual(split[5], [660,1380]);
  assert.deepEqual(parseOpeningHours('Fr,Sa 18:00-02:00')[5], [1080,1560]);
  assert.deepEqual(parseOpeningHours('Mo-Su 08:00-24:00')[2], [480,1440]);
  assert.equal(dayHours({schedule:split}, 1), '11am–2pm, 5pm–10pm');
});

test('anything beyond the plain weekly subset is left unparsed instead of guessed', () => {
  for (const text of ['Jan-Mar Mo-Fr 08:00-17:00', 'Mo-Fr 18:00+', 'sunrise-sunset', 'Mo-Fr 08:00-17:00 "by appointment"', 'PH off', '', null, 'Mo-Fr', 'Mo-Fr 25:00-26:00'])
    assert.equal(parseOpeningHours(text), null, String(text));
  assert.deepEqual(parseOpeningHours('Mo-Fr 09:00-17:00; PH off')[1], [540,1020]);
});

test('schema.org opening specifications use the same format and skip seasonal entries', () => {
  const schedule = parseOpeningSpecification([
    {dayOfWeek:['https://schema.org/Monday','Tuesday'], opens:'11:00:00', closes:'21:30:00'},
    {dayOfWeek:'Saturday', opens:'10:00', closes:'01:00'},
    {dayOfWeek:'Sunday', opens:'12:00', closes:'18:00', validFrom:'2026-12-20', validThrough:'2026-12-31'},
  ]);
  assert.deepEqual(schedule, [null,[660,1290],[660,1290],null,null,null,[600,1500]]);
  assert.equal(parseOpeningSpecification([{dayOfWeek:'Funday', opens:'1', closes:'2'}]), null);
});

test('split shifts report open and closed correctly, including the break', () => {
  const place = {schedule:parseOpeningHours('Mo-Su 11:00-14:00,17:00-22:00')};
  const at = time => openingStatus(place, new Date(`2026-10-12T${time}:00-05:00`)).open;
  assert.equal(at('12:00'), true);
  assert.equal(at('15:30'), false);
  assert.equal(at('18:00'), true);
});

test('comma-joined rules add to earlier days and day lists may contain spaces', () => {
  const lunch = parseOpeningHours('Mo-Fr 11:30-14:30, Mo-Th 17:00-22:00, Fr-Sa 17:00-22:30');
  assert.deepEqual(lunch[1], [[690,870],[1020,1320]]);
  assert.deepEqual(lunch[6], [1020,1350]);
  assert.deepEqual(parseOpeningHours('Mo, We 10:00-18:00; Tu,Th 12:00-20:00')[3], [600,1080]);
  assert.deepEqual(parseOpeningHours('Mo,Tu closed, We 17:00-00:00')[1], null);
});
