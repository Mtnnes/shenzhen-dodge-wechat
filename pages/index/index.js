import { Game } from '../../engine'

const DESIGN_WIDTH = 390
const DESIGN_HEIGHT = 780

Page({
  data: {
    shareReady: false,
    shareImage: '',
    shareTitle: '深圳早高峰，你能坚持 20 秒吗？'
  },

  onReady() {
    const query = this.createSelectorQuery()
    query.select('#game-canvas').fields({ node: true, size: true }).exec((result) => {
      const canvasInfo = result && result[0]
      if (!canvasInfo || !canvasInfo.node) {
        wx.showToast({ title: '画布初始化失败', icon: 'none' })
        return
      }

      const canvas = canvasInfo.node
      const system = wx.getWindowInfo()
      const dpr = system.pixelRatio || 1
      canvas.width = canvasInfo.width * dpr
      canvas.height = canvasInfo.height * dpr

      this.canvas = canvas
      this.canvasWidth = canvasInfo.width
      this.canvasHeight = canvasInfo.height
      this.audio = wx.createInnerAudioContext()
      this.audio.src = '/assets/commute-citypop.m4a'
      this.audio.loop = true
      this.audio.volume = 0.48

      const imagePaths = [
        '/assets/shenzhen-gangxia.png',
        '/assets/shenzhen-hubei.png',
        '/assets/shenzhen-baishizhou.png'
      ]
      const images = imagePaths.map((src) => {
        const image = canvas.createImage()
        image.onload = () => this.game && this.game.render()
        image.src = src
        return image
      })

      this.game = new Game(canvas, {
        images,
        music: (on) => on ? this.audio.play() : this.audio.pause(),
        share: (record) => this.prepareShare(record),
        load: () => Number(wx.getStorageSync('sz-commute-best')) || 0,
        save: (value) => wx.setStorageSync('sz-commute-best', value),
        loadDeaths: () => Number(wx.getStorageSync('sz-commute-deaths')) || 0,
        saveDeaths: (value) => wx.setStorageSync('sz-commute-deaths', value),
        sound: (kind, muted) => {
          if ((kind === 'hit' || kind === 'near') && !muted) {
            wx.vibrateShort({ type: 'light' })
          }
        }
      })

      let last = 0
      const frame = (time) => {
        if (!this.canvas || !this.game) return
        this.game.update(last ? (time - last) / 1000 : 0)
        last = time
        this.game.render()
        this.animationFrame = canvas.requestAnimationFrame(frame)
      }
      this.animationFrame = canvas.requestAnimationFrame(frame)
    })
  },

  toGamePoint(touch) {
    return {
      x: touch.x / this.canvasWidth * DESIGN_WIDTH,
      y: touch.y / this.canvasHeight * DESIGN_HEIGHT
    }
  },

  onTouchStart(event) {
    if (!this.game || !event.touches.length) return
    const point = this.toGamePoint(event.touches[0])
    this.game.pointerDown(point.x, point.y)
  },

  onTouchMove(event) {
    if (!this.game || !event.touches.length) return
    const point = this.toGamePoint(event.touches[0])
    this.game.pointerMove(point.x, point.y)
  },

  onTouchEnd() {
    if (this.game) this.game.pointerUp()
  },

  onTouchCancel() {
    if (this.game) this.game.pointerCancel()
  },

  prepareShare(record = {}) {
    const time = Number(record.time || 0).toFixed(1)
    this.pendingShareGate = Boolean(record.gate)
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      fileType: 'png',
      success: ({ tempFilePath }) => {
        this.setData({
          shareReady: true,
          shareImage: tempFilePath,
          shareTitle: `深圳闪避 ${time} 秒｜惊险擦身 ${record.near || 0} 次`
        })
      },
      fail: () => wx.showToast({ title: '战报生成失败，请重试', icon: 'none' })
    }, this)
  },

  closeShare() {
    this.setData({ shareReady: false })
  },

  onShareAppMessage() {
    if (this.pendingShareGate && this.game) {
      this.pendingShareGate = false
      this.game.unlockShare()
    }
    return {
      title: this.data.shareTitle,
      imageUrl: this.data.shareImage || '/assets/shenzhen-gangxia.png'
    }
  },

  onShow() {
    if (this.game && this.game.musicOn && this.audio) this.audio.play()
  },

  onHide() {
    if (this.game) {
      this.game.pointerCancel()
      this.game.pause()
    }
    if (this.audio) this.audio.pause()
  },

  onUnload() {
    if (this.canvas && this.animationFrame) {
      this.canvas.cancelAnimationFrame(this.animationFrame)
    }
    if (this.audio) this.audio.destroy()
    this.canvas = null
    this.game = null
  }
})
