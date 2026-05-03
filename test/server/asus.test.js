import { describe, it, expect } from 'vitest';
import {
  splitSections, parseUptime, parseLoadavg, parseMeminfo,
  parseCpuLine, cpuPct, parseArp, parseWan, parseMeshNodes, buildPayload,
} from '../../src/server/asus.js';

describe('splitSections', () => {
  it('parses ##header-delimited blocks', () => {
    const out = '##a\nfoo\n##b\nbar baz\n##c\n';
    const s = splitSections(out);
    expect(s.a).toBe('foo');
    expect(s.b).toBe('bar baz');
    expect(s.c).toBe('');
  });
  it('handles empty input', () => {
    expect(splitSections('')).toEqual({});
  });
});

describe('parseUptime', () => {
  it('reads first float, rounds to int', () => {
    expect(parseUptime('123456.78 999.99')).toBe(123457);
  });
  it('returns null on garbage', () => {
    expect(parseUptime('hello')).toBeNull();
    expect(parseUptime('')).toBeNull();
  });
});

describe('parseLoadavg', () => {
  it('extracts 3-tuple', () => {
    expect(parseLoadavg('0.10 0.20 0.30 1/200 12345')).toEqual([0.10, 0.20, 0.30]);
  });
  it('returns null on malformed', () => {
    expect(parseLoadavg('bad')).toBeNull();
  });
});

describe('parseMeminfo', () => {
  it('uses MemAvailable when present', () => {
    const body = `MemTotal:        4000000 kB
MemFree:          100000 kB
MemAvailable:    2000000 kB`;
    expect(parseMeminfo(body)).toEqual({
      totalKb: 4_000_000,
      usedKb: 2_000_000,
      pct: 50.0,
    });
  });
  it('falls back to MemFree', () => {
    const body = `MemTotal:        1000 kB
MemFree:          250 kB`;
    expect(parseMeminfo(body)).toEqual({ totalKb: 1000, usedKb: 750, pct: 75.0 });
  });
  it('returns null without MemTotal', () => {
    expect(parseMeminfo('garbage')).toBeNull();
  });
});

describe('cpuPct / parseCpuLine', () => {
  it('parses /proc/stat first line', () => {
    expect(parseCpuLine('cpu 100 0 50 200 25 0 0 0 0 0')).toEqual({
      idle: 225,
      total: 375,
    });
  });
  it('computes delta percentage', () => {
    const a = 'cpu 100 0 50 200 0 0 0 0 0 0';
    const b = 'cpu 200 0 100 250 0 0 0 0 0 0';
    expect(cpuPct(a, b)).toBe(75.0);
  });
  it('returns null when stats are flat', () => {
    const a = 'cpu 1 0 0 0 0 0 0 0 0 0';
    expect(cpuPct(a, a)).toBeNull();
  });
});

describe('parseArp', () => {
  it('counts online vs total + wired/wireless heuristic', () => {
    const body = `IP        HW type  Flags   HW address        Mask   Device
10.0.0.2  0x1      0x2     aa:bb:cc:dd:ee:01  *      eth0
10.0.0.3  0x1      0x0     aa:bb:cc:dd:ee:02  *      wlan0
10.0.0.4  0x1      0x2     aa:bb:cc:dd:ee:03  *      wl0
10.0.0.5  0x1      0x0     00:00:00:00:00:00  *      eth0`;
    expect(parseArp(body)).toEqual({
      total: 3, online: 2, wired: 1, wireless: 2,
    });
  });
  it('handles empty', () => {
    expect(parseArp('')).toEqual({ total: 0, online: 0, wired: 0, wireless: 0 });
  });
});

describe('parseWan', () => {
  it('flips up flag on state==2', () => {
    expect(parseWan({
      wan_state: '2', wan_proto: 'dhcp', wan_ip: '1.2.3.4',
      wan_gw: '1.2.3.1', wan_dns: '8.8.8.8',
    })).toEqual({
      up: true, type: 'dhcp', ip: '1.2.3.4', gateway: '1.2.3.1', dns: '8.8.8.8',
    });
  });
  it('reports down', () => {
    expect(parseWan({ wan_state: '0' }).up).toBe(false);
  });
});

describe('parseMeshNodes', () => {
  it('marks first entry as cap, rest as re', () => {
    const raw = '<RT-AX88U>AA:BB:CC:DD:EE:01>1.0>0>1<RT-AX86U>AA:BB:CC:DD:EE:02>1.0>0>1';
    const nodes = parseMeshNodes(raw, '');
    expect(nodes).toHaveLength(2);
    expect(nodes[0].role).toBe('cap');
    expect(nodes[1].role).toBe('re');
    expect(nodes[0].mac).toBe('AA:BB:CC:DD:EE:01');
    expect(nodes[0].online).toBe(true);
  });
  it('returns empty for blank input', () => {
    expect(parseMeshNodes('', '')).toEqual([]);
  });
  it('skips entries with no MAC', () => {
    expect(parseMeshNodes('<<', '')).toEqual([]);
  });
});

describe('buildPayload', () => {
  it('aggregates parsed sections', () => {
    const out = `##model
RT-AX88U
##firmver
3
##buildno
0
##extendno
386_50208
##wan_state
2
##wan_proto
pppoe
##wan_ip
1.2.3.4
##wan_gw
1.2.3.1
##wan_dns
8.8.8.8
##uptime
12345.0 99999.0
##loadavg
0.50 0.40 0.30 1/200 12345
##meminfo
MemTotal:        1000 kB
MemFree:          400 kB
MemAvailable:     600 kB
##stat1
cpu 100 0 50 200 0 0 0 0 0 0
##stat2
cpu 200 0 100 250 0 0 0 0 0 0
##arp
header
1 0x1 0x2 aa:bb:cc:dd:ee:01 * eth0
##cfg_clientlist
<RT-AX88U>AA:BB:CC:DD:EE:01>1.0>0>1
##cfg_device_list
##end`;
    const p = buildPayload(out, 'main');
    expect(p.model).toBe('RT-AX88U');
    expect(p.firmware).toBe('3.0.386_50208');
    expect(p.wan.up).toBe(true);
    expect(p.cpu).toBe(75.0);
    expect(p.mem.pct).toBe(40.0);
    expect(p.clients.online).toBe(1);
    expect(p.mesh).toHaveLength(1);
  });
  it('skips mesh on node target', () => {
    const out = '##end\n';
    expect(buildPayload(out, 'node').mesh).toBeUndefined();
  });
});
