// Tiny MQTT 3.1.1 client over WebSockets! No dependencies, no signup brokers!
// Enough protocol to CONNECT (with a Will!), SUBSCRIBE, PUBLISH, and PING!
// Works in browsers (WebSocket) and imports cleanly in Node for tests!

function encodeString(str) {
    const bytes = new TextEncoder().encode(str);
    const out = new Uint8Array(2 + bytes.length);
    out[0] = bytes.length >> 8;
    out[1] = bytes.length & 0xff;
    out.set(bytes, 2);
    return out;
}

function encodeRemaining(len) {
    const out = [];
    do {
        let b = len % 128;
        len = Math.floor(len / 128);
        if (len > 0) b |= 0x80;
        out.push(b);
    } while (len > 0);
    return new Uint8Array(out);
}

function concat(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
}

export function buildConnect(opts) {
    const header = [0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04];
    let flags = 0x02; // clean session!
    if (opts.will) flags |= 0x04 | (opts.will.retain ? 0x20 : 0);
    const keep = new Uint8Array([(opts.keepalive || 60) >> 8, (opts.keepalive || 60) & 0xff]);
    const parts = [new Uint8Array(header.concat([flags])), keep, encodeString(opts.clientId)];
    if (opts.will) {
        parts.push(encodeString(opts.will.topic));
        parts.push(encodeString(opts.will.message));
    }
    const body = concat(parts);
    return concat([new Uint8Array([0x10]), encodeRemaining(body.length), body]);
}

export function buildSubscribe(packetId, topics) {
    const parts = [new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff])];
    for (const t of topics) {
        parts.push(encodeString(t));
        parts.push(new Uint8Array([0]));
    }
    const body = concat(parts);
    return concat([new Uint8Array([0x82]), encodeRemaining(body.length), body]);
}

export function buildPublish(topic, payloadStr, retain) {
    const topicBytes = encodeString(topic);
    const payload = new TextEncoder().encode(payloadStr);
    const body = concat([topicBytes, payload]);
    return concat([new Uint8Array([0x30 | (retain ? 0x01 : 0)]), encodeRemaining(body.length), body]);
}

export function buildPing() {
    return new Uint8Array([0xc0, 0x00]);
}

export function buildUnsubscribe(packetId, topics) {
    const parts = [new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff])];
    for (const t of topics) parts.push(encodeString(t));
    const body = concat(parts);
    return concat([new Uint8Array([0xa2]), encodeRemaining(body.length), body]);
}

// Parses ONE packet stream chunk into complete packets! Returns {packets, rest}!
export function parsePackets(buf) {
    const packets = [];
    let o = 0;
    while (o < buf.length) {
        if (o + 2 > buf.length) break;
        const header = buf[o];
        let mult = 1, len = 0, i = 1;
        let b = 0;
        do {
            if (o + i >= buf.length) return { packets, rest: buf.slice(o) };
            b = buf[o + i];
            len += (b & 127) * mult;
            mult *= 128;
            i++;
            if (i > 5) return { packets, rest: buf.slice(o) };
        } while ((b & 128) !== 0);
        if (o + i + len > buf.length) return { packets, rest: buf.slice(o) };
        packets.push({ header, body: buf.slice(o + i, o + i + len) });
        o = o + i + len;
    }
    return { packets, rest: buf.slice(o) };
}

export function parsePublish(packet) {
    const body = packet.body;
    const qos = (packet.header >> 1) & 0x03;
    if (body.length < 2) return null;
    const tlen = (body[0] << 8) | body[1];
    if (body.length < 2 + tlen) return null;
    const topic = new TextDecoder().decode(body.slice(2, 2 + tlen));
    let o = 2 + tlen;
    if (qos > 0) o += 2;
    const payload = new TextDecoder().decode(body.slice(o));
    return { topic, payload, qos };
}

export class MiniMqtt {
    constructor(url, opts) {
        this.url = url;
        this.opts = opts || {};
        this.ws = null;
        this.buf = new Uint8Array(0);
        this.packetId = 1;
        this.connected = false;
        this.pingTimer = null;
        this.onmessage = null;
        this.onopen = null;
        this.onclose = null;
        this.onerror = null;
    }

    connect() {
        const WS = (typeof WebSocket !== 'undefined') ? WebSocket : null;
        if (!WS) throw new Error('No WebSocket here!');
        // Brokers REQUIRE the mqtt subprotocol or they drop the handshake!
        this.ws = new WS(this.url, 'mqtt');
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = () => {
            this.ws.send(buildConnect({
                clientId: this.opts.clientId || ('mini_' + Math.random().toString(36).slice(2, 14)),
                keepalive: this.opts.keepalive || 60,
                will: this.opts.will,
            }));
        };
        this.ws.onmessage = (e) => {
            const chunk = new Uint8Array(e.data);
            const joined = new Uint8Array(this.buf.length + chunk.length);
            joined.set(this.buf, 0);
            joined.set(chunk, this.buf.length);
            const { packets, rest } = parsePackets(joined);
            this.buf = rest;
            for (const p of packets) this.handle(p);
        };
        this.ws.onclose = (e) => {
            this.connected = false;
            clearInterval(this.pingTimer);
            if (this.onclose) this.onclose(e);
        };
        this.ws.onerror = (e) => { if (this.onerror) this.onerror(e); };
    }

    handle(p) {
        const type = p.header >> 4;
        if (type === 2) { // CONNACK!
            const ok = p.body.length >= 2 && p.body[1] === 0;
            if (ok) {
                this.connected = true;
                clearInterval(this.pingTimer);
                this.pingTimer = setInterval(() => {
                    try { this.ws.send(buildPing()); } catch (e) {}
                }, 25000);
                if (this.onopen) this.onopen();
            } else if (this.onerror) {
                this.onerror(new Error('Connect refused!'));
            }
        } else if (type === 3) { // PUBLISH!
            const msg = parsePublish(p);
            if (msg && this.onmessage) this.onmessage(msg.topic, msg.payload);
        }
        // SUBACK (9) + PINGRESP (13) need no action!
    }

    subscribe(topics) {
        const id = (this.packetId++ % 60000) + 1;
        this.ws.send(buildSubscribe(id, Array.isArray(topics) ? topics : [topics]));
    }

    unsubscribe(topics) {
        const id = (this.packetId++ % 60000) + 1;
        this.ws.send(buildUnsubscribe(id, Array.isArray(topics) ? topics : [topics]));
    }

    publish(topic, payload, retain) {
        this.ws.send(buildPublish(topic, payload, !!retain));
    }

    close() {
        clearInterval(this.pingTimer);
        try { this.ws.send(new Uint8Array([0xe0, 0x00])); } catch (e) {}
        try { this.ws.close(); } catch (e) {}
    }
}
