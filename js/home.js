import { ModelDisplayer } from './modelLoader.js'
import { CursorObject } from './cursorObject.js'
import { AnimationNameConstants } from './animationConstants.js'

var modelDisplayArea = $('.model-area')
var modelFileName = 'char_2.glb'
var cursorFileName = 'hand.glb'
var modelDisplayer = new ModelDisplayer(modelFileName, modelDisplayArea)
var cursorObject = new CursorObject(modelDisplayer.getScene())

fixWindowSize(1200, 900)

$(document).ready(async function () {
  await modelDisplayer.displayModelOnWebpage(modelFileName, modelDisplayArea)
  await cursorObject.loadCursorObjectToScene(cursorFileName)
  // modelDisplayer.displayMotionRegions()
  // cursorObject.dispalyTriggerRegions()

  $('body').mousemove(function (event) {
    let mousePosition = { x: event.pageX, y: event.pageY }
    cursorObject.setCursorPosition(mousePosition, modelDisplayer.getCamera(), modelDisplayer.getRenderer())

    let triggerRegionPoints = modelDisplayer.getTriggerRegions()
    let activationRegion = modelDisplayer.getActivationRegion()

    const animationToBePlayed = cursorObject.getModelAnimation()
    if (animationToBePlayed === AnimationNameConstants.NONE) {
      modelDisplayer.revertToOriginalPosition()
    } else {
      modelDisplayer.playAnimation(animationToBePlayed)
      cursorObject.playAnimation(animationToBePlayed)
    }

    // Check first if the mouse is outside of the activationRegion
    // If so, play an animaiton to revert the character to its original position
    // if (!isWithinTriggerRegion(mousePosition, activationRegion)) {
    //   modelDisplayer.revertToOriginalPosition()
    // } else {
    //   for (let i = 0; i < triggerRegionPoints.length; i++) {
    //     if (isWithinTriggerRegion(mousePosition, triggerRegionPoints[i])) {
    //       modelDisplayer.playAnimation(i)
    //     }
    //   }
    // }
  })

  $(window).click((e) => {
    e.preventDefault()
    cursorObject.playAnimation(AnimationNameConstants.CLICK)
    console.log(cursorObject.getPostion())
  })

  $(window).scroll((e) => {
    e.preventDefault()
    cursorObject.playAnimation(AnimationNameConstants.SCROLL)
    e.stopPropagation()
  })

  animate()
})

/**
 * Checks whether the mouse position is within the model's animation trigger regions
 * @param {Object} mousePosition Object containing the x and y coordinates of the mouse
 * @param {Object} triggerRegionKeyPoints Object containign the x and y coordinates of the trigger region's centre and top-most point
 * @returns {boolean} A boolean indicating whether the mouse is within the circular trigger region
 */
function isWithinTriggerRegion (mousePosition, triggerRegionKeyPoints) {
  let radius = euclidianDistance(triggerRegionKeyPoints.center, triggerRegionKeyPoints.top)
  let distanceFromMouseToCentre = euclidianDistance(triggerRegionKeyPoints.center, mousePosition)

  return distanceFromMouseToCentre <= radius
}

/**
 * Calcualtes the euclideanDistance between two points
 * @param {Object} p1 A two-dimentional point with an x and y coordinate
 * @param {Object} p2 A two-dimentional point with an x and y coordinate
 */
function euclidianDistance (p1, p2) {
  return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2))
}

/**
 * Start the main animation loop
 */
function animate () {
  requestAnimationFrame(animate)
  modelDisplayer.animate()
  cursorObject.animate()
}

function fixWindowSize (length, height) {
  $(window).resize(function () {
    window.resizeTo(length, height)
  })
}
