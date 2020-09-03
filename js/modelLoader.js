import {
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  Color,
  AmbientLight,
  PointLight,
  Vector3,
  Box3
} from './libs/three.module.js'

const TIME_SCALE_FACTOR = 0.75

// Global reference to the loaded model so that other functions can manipulate it

/**
 * Configures user interaction and manipualtion of the view of the scene
 * @param {THREE.PerspectiveCamera} camera The main camera of the renderer
 * @param {THREE.PointLight} pointLight The main point light used to create shadow 3D effect when viewing model
 */
let enableOrbitalControls = (camera, pointLight) => {
  var controls = new THREE.OrbitControls(camera, document.querySelector('body'))
  controls.enableZoom = true
  controls.addEventListener('change', () => {
    pointLight.position.copy(camera.position)
  })

  return controls
}

/**
 * Re-adjusts the camera and render size automatically whenever the browser window size is adjusted
 * @param {THREE.PerspectiveCamera} camera The main camera of the renderer
 * @param {THREE.WebGLRenderer} renderer The main webGL renderer
 */
let enableResizeAdjust = (camera, renderer) => {
  window.addEventListener('resize', () => {
    let width = window.innerWidth
    let height = window.innerHeight
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  })
}

/**
 * Creates and returns a pre-configured perspective camera
 * @returns {THREE.PerspectiveCamera}
 */
let createCamera = (domElement) => {
  let camera = new THREE.PerspectiveCamera(75, domElement.width() / domElement.height(), 0.1, 1000)
  camera.position.set(100, 100, 100)
  camera.lookAt(new Vector3(0, 0, 0))
  return camera
}

/**
 * Creates and returns a pre-configured webGL renderer
 * @returns {THREE.WebGLRenderer}
 */
let createRenderer = () => {
  let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(1200, 900)
  return renderer
}

/**
 * Class for dislaying and controlling the model
 */
class ModelDisplayer {
  /**
   * Constructor
   * @param {String} modelFileName File name of the model (assumed to be in the "models" folder)
   * @param {Div} displayDOMElement Div object in which the object will be displayed
   */
  constructor (modelFileName, displayDOMElement) {
    this._clock = new THREE.Clock()
    this._mixer = {}
    this._model = {}
    this._scene = new Scene()
    this._scene.background = new THREE.Color(0x000000)
    this._camera = createCamera(displayDOMElement)
    this._renderer = createRenderer()
    this._enableResizeAdjust(displayDOMElement.width, displayDOMElement.height)
    this._center = {}
    this._timeOff = new Date()
    this._currentAction = null
    this._isAnimationPlayable = true
  }

  getScene () {
    return this._scene
  }

  getCamera () {
    return this._camera
  }

  getRenderer () {
    return this._renderer
  }

  /**
   * Plays a specified animation of the model
   * @param {Number} index Index of the animation in the array of animations stores with the model
   */
  playAnimation (clipName) {
    if (this._isActionPlayable()) {
      let isClipAtStartingPoint = false

      if (this._currentAction == null) {
        isClipAtStartingPoint = true
      } else if (this._currentAction.time === 0) {
        isClipAtStartingPoint = true
      }

      if (isClipAtStartingPoint) {
        let clip = THREE.AnimationClip.findByName(this._model.animations, clipName)
        this._currentAction = this._mixer.clipAction(clip)
        this._currentAction.setLoop(THREE.LoopOnce)
        this._currentAction.clampWhenFinished = true
        this._currentAction.paused = false
        this._currentAction.enabled = true
        this._currentAction.timeScale = 1
        this._currentAction.play()
      }
    }
  }

  /**
   * Returns a boolean which indicates whether an animation can be played at this time
   *  @returns {boolean} Whether an animation can be played
   */
  _isActionPlayable () {
    let shouldPlay = false

    if (this._currentAction == null) {
      shouldPlay = true
    } else if (this._currentAction.paused || this._currentAction.time === 0) {
      shouldPlay = true
    }

    return shouldPlay
  }

  /**
   * Plays the most recenly-played animation in reverse so that the model can return to its original position
   */
  revertToOriginalPosition () {
    if (this._isActionPlayable()) {
      let isClipAtEndPoint = true

      if (this._currentAction == null) {
        isClipAtEndPoint = false
      } else if (this._currentAction.time === 0) {
        isClipAtEndPoint = false
      }

      if (isClipAtEndPoint) {
        this._currentAction.timeScale = -1
        this._currentAction.clampWhenFinished = false
        this._currentAction.paused = false
        this._currentAction.setLoop(THREE.LoopOnce)
        this._currentAction.play()
      }
    }
  }

  /**
   * Displays a specified model to the web page
   * @param {String} filename File name of the model (assumed to be in the "models" folder)
   * @param {Div} displayDOMElement Div object in which the object will be displayed
   */
  displayModelOnWebpage (filename, displayDOMElement) {
    return new Promise((resolve, reject) => {
      displayDOMElement.append(this._renderer.domElement)

      // Add ambient lighting
      var ambientLight = new AmbientLight(0xffffff, 0.2)
      this._scene.add(ambientLight)

      // Add point light
      var pointLight = new PointLight(0xababab, 1)
      pointLight.position.set(100, -100, 100)
      this._scene.add(pointLight)

      // Add the model
      this._loadModelOntoScene(filename).then((model) => {
        this._model = model
        this._mixer = new THREE.AnimationMixer(model.scene)
        resolve(model)
      }).catch((err) => {
        console.error(err)
        reject(err)
      })
    })
  }

  /**
   * Reutrns the coordinates of the centre of the scene
   */
  _getCentre () {
    return this._center
  }

  /**
   * Gets the coordiantes of the centre and topmost points of the activation region
   * @returns {Object} An object that contains the pixel coordinates of the centre and topmost point of the actviation region
   */
  getActivationRegion () {
    const RADIUS = 70
    let regionCentre = {
      x: this._getCentre().x,
      y: this._getCentre().y + 25
    }

    let point2D = {
      center: this._get2DCoordinatesOf3DPoint(regionCentre.x, regionCentre.y, 0),
      top: this._get2DCoordinatesOf3DPoint(regionCentre.x + RADIUS, regionCentre.y, 0)
    }

    return point2D
  }

  /**
   * Gets the coordiantes of the centre and topmost points of each of the trigger regions
   * @returns {Object} An object that contains the pixel coordinates of the centre and topmost point of each of the trigger regions
   */
  getTriggerRegions () {
    let triggerPoints = [
      {
        x: this._getCentre().x - 5,
        y: this._getCentre().y + 50
      },
      {
        x: this._getCentre().x + 30,
        y: this._getCentre().y + 50
      },
      {
        x: this._getCentre().x - 50,
        y: this._getCentre().y + 10
      },
      {
        x: this._getCentre().x + 60,
        y: this._getCentre().y + 40
      }
    ]
    let arrayOf2DPoints = []
    let triggerPointRadii = [10, 15, 20, 10]
    let index = 0
    triggerPoints.forEach((point) => {
      let point2D = {
        center: this._get2DCoordinatesOf3DPoint(point.x, point.y, 0),
        top: this._get2DCoordinatesOf3DPoint(point.x + triggerPointRadii[index], point.y, 0)
      }

      arrayOf2DPoints.push(point2D)
      index += 1
    })

    return arrayOf2DPoints
  }

  /**
   * Shows spheres around the motion trigger regions
   */
  displayMotionRegions () {
    var geometry = new THREE.SphereGeometry(20, 32, 32)
    var material = new THREE.MeshBasicMaterial({ color: 0x3236a8 })
    material.transparent = true
    material.opacity = 1
    var circle3 = new THREE.Mesh(geometry, material)
    circle3.position.x = this._getCentre().x - 50
    circle3.position.y = this._getCentre().y + 10
    // this._scene.add(circle3)

    geometry = new THREE.SphereGeometry(10, 32, 32)
    var circle1 = new THREE.Mesh(geometry, material)
    circle1.position.x = 69
    circle1.position.y = 66
    circle1.position.z = 64
    this._scene.add(circle1)

    geometry = new THREE.SphereGeometry(15, 32, 32)
    var circle2 = new THREE.Mesh(geometry, material)
    circle2.position.x = this._getCentre().x + 30
    circle2.position.y = this._getCentre().y + 50
    // this._scene.add(circle2)

    geometry = new THREE.SphereGeometry(10, 32, 32)
    var circle4 = new THREE.Mesh(geometry, material)
    circle4.position.x = this._getCentre().x + 60
    circle4.position.y = this._getCentre().y + 40
    // this._scene.add(circle4)
  }

  /**
   * Converts a 3D point in three.js scene to its respective 2D coordinates on the webpage
   * @param {number} x x-coordinate
   * @param {number} y y-coordinate
   * @param {number} z z-coordinate
   */
  _get2DCoordinatesOf3DPoint (x, y, z) {
    const vector = new THREE.Vector3(x, y, z)
    const canvas = this._renderer.domElement

    this._camera.updateMatrixWorld()
    vector.project(this._camera)

    vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width / window.devicePixelRatio))
    vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height / window.devicePixelRatio))

    return { x: vector.x, y: vector.y }
  }

  /**
   * Loads models to the current scene
   * @param {String} filename Filename of the model (assumed to be in the "models" folder)
   * @returns {Promise} resolves the gltf object upon success
   */
  _loadModelOntoScene (filename) {
    var loader = new THREE.GLTFLoader()

    return new Promise((resolve, reject) => {
      loader.load('../models/' + filename, gltf => {
        let model = gltf.scene
        model.scale.set(2, 2, 2)

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3()).length()
        this._center = box.getCenter(new THREE.Vector3())

        model.position.x += (model.position.x - this._center.x) // - 160
        model.position.y += (model.position.y - this._center.y) - 80
        model.position.z += (model.position.z - this._center.z)

        // this._camera.near = size / 100
        // this._camera.far = size * 100
        // this._camera.position.y = -1
        this._camera.setFocalLength(35)
        this._camera.updateProjectionMatrix()

        model.lookAt(this._camera.position)

        this._scene.add(model)
        resolve(gltf)
      }, undefined, function (error) {
        console.error(error)
        reject(error)
      })
    })
  }

  /**
   * Function to be called within the main animation loop
   */
  animate () {
    let delta = this._clock.getDelta() * TIME_SCALE_FACTOR
    this._mixer.update(delta)
    this._renderer.render(this._scene, this._camera)
  }

  /**
   * Enables to model to resize as the browser window size changes
   */
  _enableResizeAdjust (width, height) {
    window.addEventListener('resize', () => {
      this._renderer.setSize(width, height)
      this._camera.aspect = width / height
      this._camera.updateProjectionMatrix()
    })
  }
}

export { ModelDisplayer }
