import { AnimationNameConstants } from './animationConstants.js'

const TRIGGER_REGION_RADIUS = 5
const TIME_SCALE_FACTOR = 0.75
class CursorObject {
  constructor (scene) {
    this._model = {}
    this._clock = new THREE.Clock()
    this._mixer = {}
    this._currentAction = null
    this._pointLight = new THREE.PointLight(0xffffff, 0.5)
    this._currentClipDuration = 0
    this._scene = scene

    this._trigger_centres = new Map([
      [AnimationNameConstants.TOUCH, new THREE.Vector3(70, 60, 65)],
      [AnimationNameConstants.SHOES, new THREE.Vector3(85, 55, 55)],
      [AnimationNameConstants.HEAD, new THREE.Vector3(75, 65, 60)],
      [AnimationNameConstants.LA, new THREE.Vector3(65, 60, 75)]
    ])
  }

  getPostion () {
    return this._model.position
  }
  loadCursorObjectToScene (filename) {
    var loader = new THREE.GLTFLoader()
    return new Promise((resolve, reject) => {
      loader.load('../models/' + filename, gltf => {
        let model = gltf.scene
        model.scale.set(0.2, 0.2, 0.2)

        const box = new THREE.Box3().setFromObject(model)
        this._center = box.getCenter(new THREE.Vector3())

        model.position.x += (model.position.x - this._center.x)
        model.position.y += (model.position.y - this._center.y)
        model.position.z += (model.position.z - this._center.z)

        this._model = model
        this._scene.add(this._model)
        this._scene.add(this._pointLight)
        this._mixer = new THREE.AnimationMixer(this._model)
        this._animations = gltf.animations

        resolve(gltf)
      }, undefined, function (error) {
        console.error(error)
        reject(error)
      })
    })
  }

  setCursorPosition (mousePos, camera, renderer) {
    const canvas = renderer.domElement
    let normalisedPoint = new THREE.Vector2()
    normalisedPoint.x = (mousePos.x / window.innerWidth) * 2 - 1
    normalisedPoint.y = -(mousePos.y / window.innerHeight) * 2 + 1
    camera.updateMatrixWorld()
    let raycaster = new THREE.Raycaster()
    let intersectPoint = new THREE.Vector3()
    raycaster.setFromCamera(normalisedPoint, camera)
    let plane = new THREE.Plane(new THREE.Vector3(-1, -1, -1), 100)
    raycaster.ray.intersectPlane(plane, intersectPoint)
    this._model.position.copy(intersectPoint.multiplyScalar(2))
  }

  _isActionPlayable () {
    let shouldPlay = false

    if (this._currentAction == null) {
      shouldPlay = true
    } else if (this._currentAction.time === this._currentClipDuration) {
      shouldPlay = true
      this._currentAction.reset()
    }

    return shouldPlay
  }

  playAnimation (clipName) {
    if ((clipName === AnimationNameConstants.LA || clipName === AnimationNameConstants.SCROLL ||
      clipName === AnimationNameConstants.CLICK || clipName === AnimationNameConstants.TOUCH) &&
      this._isActionPlayable()) {
      if (clipName === AnimationNameConstants.TOUCH) { clipName = AnimationNameConstants.INDEX_FINGER }
      let clip = THREE.AnimationClip.findByName(this._animations, clipName)
      this._currentClipDuration = clip.duration
      this._currentAction = this._mixer.clipAction(clip)
      this._currentAction.setLoop(THREE.LoopOnce)
      this._currentAction.timeScale = 1
      this._currentAction.play()
    }
  }

  getModelAnimation () {
    let animation = AnimationNameConstants.NONE

    this._trigger_centres.forEach((value, key) => {
      if (this._model.position.distanceTo(value) <= TRIGGER_REGION_RADIUS) {
        animation = key
      }
    })

    return animation
  }

  animate () {
    let delta = this._clock.getDelta() * TIME_SCALE_FACTOR
    this._mixer.update(delta)
    this._pointLight.position.set(this._model.position.x - 500, this._model.position.y + 1000, this._model.position.z - 500)
  }
}

export { CursorObject }
