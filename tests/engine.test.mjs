import assert from 'node:assert/strict'
import { Game, sweptHit, LANES, MIN_X, MAX_X } from '../engine.js'

const ctx = new Proxy({}, { get: () => () => {}, set: () => true })
const canvas = { width: 390, height: 780, getContext: () => ctx }

assert(sweptHit(0, 0, 100, 0, 50, 0, 10))
assert(!sweptHit(0, 0, 100, 0, 50, 20, 10))

const promptGame = new Game(canvas, { images: [{}, {}, {}] })
promptGame.startRequest()
assert.equal(promptGame.mode, 'music')
promptGame.chooseMusic(false)
assert.equal(promptGame.mode, 'play')
promptGame.mode = 'home'
promptGame.cycleScene()
assert.equal(promptGame.sceneChoice, 0)
promptGame.cycleScene()
assert.equal(promptGame.sceneChoice, 1)

const buttonGame = new Game(canvas)
buttonGame.pointerDown(195, 635)
assert.equal(buttonGame.mode, 'home')
buttonGame.pointerMove(10, 10)
buttonGame.pointerUp(10, 10)
assert.equal(buttonGame.mode, 'home')
buttonGame.pointerDown(195, 635)
buttonGame.pointerUp(195, 635)
assert.equal(buttonGame.mode, 'music')

promptGame.mode = 'play'
promptGame.openMenu()
assert.equal(promptGame.mode, 'menu')
assert.equal(promptGame.menuReturn, 'play')
promptGame.mode = 'help'
promptGame.openMenu()
assert.equal(promptGame.mode, 'menu')
promptGame.closeMenu()
assert.equal(promptGame.mode, 'play')
assert.equal(promptGame.countdown, 3)

const game = new Game(canvas)
game.start()
game.pause()
game.update(0.04)
assert.equal(game.time, 0)
game.resume()
for (let i = 0; i < 75; i++) game.update(0.04)
assert.equal(game.time, 0)

game.start()
for (let hit = 0; hit < 3; hit++) {
  game.invulnUntil = 0
  game.vehicles = [{ x: 195, y: 620, from: 195, end: 195, type: 0, warning: 0, age: 1.12, duration: 1.55, near: false }]
  game.update(0.04)
  assert.equal(game.lives, 2 - hit)
  if (hit < 2) assert.equal(game.mode, 'play')
}
assert.equal(game.mode, 'lose')
game.start()
assert.equal(game.vehicles.length, 0)
assert.equal(game.near, 0)

for (const fps of [30, 60]) {
  for (let run = 0; run < 50; run++) {
    game.start()
    for (let frame = 0; frame < fps * 21 && game.mode === 'play'; frame++) {
      const active = game.vehicles
        .filter((vehicle) => vehicle.y < 655)
        .sort((a, b) => (a.warning + (0.74 * a.duration - a.age)) - (b.warning + (0.74 * b.duration - b.age)))
      if (active.length) {
        const first = active[0]
        const wave = active.filter((vehicle) => vehicle.group === first.group)
        const options = LANES.filter((lane) => wave.every((vehicle) => Math.abs(vehicle.end - lane) > 43))
        if (options.length) game.target = options.sort((a, b) => Math.abs(a - game.x) - Math.abs(b - game.x))[0]
      }
      game.update(1 / fps)
      assert(game.x >= MIN_X && game.x <= MAX_X)
    }
    assert.equal(game.mode, 'win', `seed ${run} fps ${fps}`)
    assert.equal(game.time, 20)
  }
}

game.start()
game.pointerDown(195, 600)
game.pointerMove(-500)
assert.equal(game.target, MIN_X)
game.pointerMove(900)
assert.equal(game.target, MAX_X)

let savedDeaths = 0
const gate = new Game(canvas, {
  loadDeaths: () => savedDeaths,
  saveDeaths: (value) => { savedDeaths = value }
})
for (let death = 1; death <= 5; death++) {
  gate.start()
  for (let hit = 0; hit < 3; hit++) {
    gate.invulnUntil = 0
    gate.vehicles = [{ x: 195, y: 620, from: 195, end: 195, type: 0, warning: 0, age: 1.12, duration: 1.55, near: false }]
    gate.update(0.04)
  }
  assert.equal(savedDeaths, death)
  if (death < 5) assert.equal(gate.mode, 'lose')
}
assert.equal(gate.mode, 'shareGate')
gate.start()
assert.equal(gate.mode, 'shareGate')
gate.unlockShare()
assert.equal(savedDeaths, 0)
assert.equal(gate.mode, 'home')

const stagger = new Game(canvas)
stagger.start()
stagger.time = 8
stagger.spawn()
assert.equal(stagger.vehicles.length, 2)
assert(Math.abs(stagger.vehicles[1].warning - stagger.vehicles[0].warning - 0.18) < 1e-9)

const variety = new Game(canvas)
variety.start()
variety.time = 10
const kinds = new Set()
const sizes = new Set()
for (let i = 0; i < 300; i++) {
  variety.spawn()
  const wave = variety.vehicles.filter((vehicle) => vehicle.group === i)
  wave.forEach((vehicle) => kinds.add(vehicle.type))
  sizes.add(wave.length)
}
assert.deepEqual([...kinds].sort((a, b) => a - b), [0, 1, 2, 3])
assert(sizes.has(1) && sizes.has(2))
assert(variety.vehicles.some((vehicle) => vehicle.type === 3 && vehicle.from !== vehicle.end))
assert(variety.vehicles.every((vehicle) => variety.vehicles.filter((item) => item.group === vehicle.group).length <= 2))

console.log('PASS: engine behavior, 100 seeded runs, sharing gate and obstacle variety')
