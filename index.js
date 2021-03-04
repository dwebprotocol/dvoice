#!/usr/bin/env node

const DCast = require('dcast')
const { spawn } = require('child_process')

if (process.argv.length < 3) {
  console.error('Usage: dvoice <topic>')
  process.exit(1)
}

let record
let play

const beam = new DCast('dvoice ' + process.argv.slice(2).join(' '))

beam.on('remote-address', function ({ host, port }) {
  if (!host) console.error('[dcast] Could not detect remote address')
  else console.error('[dcast] Joined the DHT - remote address is ' + host + ':' + port)
  if (port) console.error('[dcast] Network is holepunchable \\o/')
})

beam.on('connected', function () {
  console.error('[dcast] Success! Encrypted tunnel established to remote peer')
  record = spawn('sox', ['-q', '--buffer', '512', '-d', '-r', '44100', '-c', '1', '-e', 'signed-integer', '-b', '16', '-t', 'wav', '-'], {
    stdio: ['inherit', 'pipe', 'inherit' ]
  })
  play = spawn('play', ['-q', '--buffer', '512', '-'], {
    stdio: ['pipe', 'inherit', 'inherit' ]
  })
  record.stdout.pipe(beam).pipe(play.stdin)
})

beam.on('end', () => {
  beam.end()
  if (record) record.kill()
  if (play) play.kill()
})

beam.resume()
beam.pause()

process.once('SIGINT', () => {
  if (record) record.kill()
  if (play) play.kill()
  if (!beam.connected) closeASAP()
  else beam.end()
})

function closeASAP () {
  console.error('[dcast] Shutting down beam...')

  const timeout = setTimeout(() => process.exit(1), 2000)
  beam.destroy()
  beam.on('close', function () {
    clearTimeout(timeout)
  })
}
