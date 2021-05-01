const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { vec2, vec3, vec4, mat3, mat4 } = require('gl-matrix')
const paper = require('paper/dist/paper-core')
const kdtree = require('kd-tree-javascript')

// console.log(mat3.set())

export class Point2D {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
  add(p) {
    return new Point2D(this.x + p.x, this.y + p.y)
  }
}

export class Path {
  constructor() {
    this.path = []
    this.drawRule = []
  }
  add(point, draws = true) {
    this.path.push(point)
    this.drawRule.push(draws)
  }
  at(index) {
    return this.path[index]
  }
  get length() {
    return this.path.length
  }
  getAverageZ() {
    let zSum = this.path.reduce((acc, p) => {
      return acc + p.z
    }, 0)
    return zSum / this.path.length
  }
  getCenter() {
    let center = this.path.reduce((acc, p) => {
      return {
        x: acc.x + p.x,
        y: acc.y + p.y,
        z: acc.z + p.z
      }
    }, { x: 0, y: 0, z: 0 })

    return {
      x: center.x / this.path.length,
      y: center.y / this.path.length,
      z: center.z / this.path.length
    }
  }
}

const interpolate = (a, b, pct) => (a + (b - a) * pct)

export class Point {
  constructor(x, y, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }
  interpolate(p2, pct) {
    return new Point(
      interpolate(this.x, p2.x, pct),
      interpolate(this.y, p2.y, pct),
      interpolate(this.z, p2.z, pct),
    )
  }
  dist(p2) {

  }
}

export class Camera {
  constructor(position, rotation, angleOfView, aspectRatio, near, far) {
    this.position = vec3.fromValues(position.x, position.y, position.z)
    this.angleOfView = angleOfView
    this.near = near
    this.far = far
    this.projectionMatrix = mat4.create()
    mat4.perspective(this.projectionMatrix, angleOfView, aspectRatio, near, far)    

    this.transformMatrix = mat4.create()
    mat4.fromTranslation(this.transformMatrix, this.position)
    // mat4.rotateZ(this.transformMatrix, this.transformMatrix, Math.PI / 2)    
    mat4.invert(this.transformMatrix, this.transformMatrix)
    // mat4.transpose(this.transformMatrix, this.transformMatrix)

    // console.log(this.projectionMatrix, this.transformMatrix)
    // TODO: rotation    
  }
  project(point) {
    let p = vec4.fromValues(point.x, point.y, point.z, 1)
    
    let view = mat4.create()
    mat4.lookAt(view, this.position, vec3.fromValues(point.x, point.y, point.z), vec3.fromValues(0, 1, 0));
    let toCamera = vec4.create()
    vec4.transformMat4(toCamera, p, this.transformMatrix)
    // vec4.transformMat4(toCamera, p, view)

    // console.log('Mat: ', this.transformMatrix, view)

    let projected = vec4.create()
    vec4.transformMat4(projected, toCamera, this.projectionMatrix)

    // console.log('Project: ', p, toCamera, projected)

    return { x: projected[0] / projected[3], y: projected[1] / projected[3] }
  }
}

export class OldCamera {
  constructor(x, y, z, d) {
    this.x = x
    this.y = y
    this.z = z
    this.d = d
  }
  project(point) {
    const r = this.d / (point.z - this.z)
    const res = new Point2D(r * (point.x - this.x), r * (point.y - this.y)).add(new Point2D(this.x, this.y))
    return res
  }
}

export class Renderer {
  constructor(camera) {
    this.camera = camera
  }
  projectPath(path, W, H) {
    const projectedPath = []
    for (let i = 0; i < path.length; i++) {
      const p3d = path.at(i)
      const p2d = this.camera.project(p3d)
      p2d.x += W / 2
      p2d.y += H / 2
      projectedPath.push(p2d)
    }
    return projectedPath
  }
  projectPaths(paths, W, H) {
    let projectedPaths = []
    paths = paths.map(p => { return { path: p, center: p.getCenter() } })
    console.log('paths: ', paths)
    paths.sort((a, b) => {
      let dA = Math.abs(this.camera.position.z - a.center.z)
      let dB = Math.abs(this.camera.position.z - b.center.z)
      let ddA = vec3.dist(this.camera.position, vec3.fromValues(a.center.x, a.center.y, a.center.z))
      let ddB = vec3.dist(this.camera.position, vec3.fromValues(b.center.x, b.center.y, b.center.z))
      if (dA < dB) return -1
      if (dA > dB) return 1
      if (ddA < ddB) return -1
      if (ddA > ddB) return 1
      return 0
    })

    for (let i = 0; i < paths.length; i++) {
      let currPath = new paper.Path()
      const projected = this.projectPath(paths[i].path, W, H)      
      projected.forEach(p => currPath.add(new paper.Point(p.x, p.y)))
      const center = projected.reduce((acc, p) => {
        return { x: acc.x + p.x / projected.length, y: acc.y + p.y / projected.length }
      }, { x: 0, y: 0 })
      // currPath.closePath()
      const drawRule = paths[i].path.drawRule
      projectedPaths.push({ kdX: center.x, kdY: center.y, path: currPath, drawRule })
    }
        
    return projectedPaths
  }
  distanceFunction(a, b) {
    return (a.kdX - b.kdX) ** 2 + (a.kdY - b.kdY) ** 2
  }
  computePathsVisibility(paths, realVisibility = true) {
    let finalPaths = []
    this.kdtree = new kdtree.kdTree([], this.distanceFunction, ["kdX", "kdY", "kdZ"])

    for (let i = 0; i < paths.length; i++) {
      let currPath = paths[i].path.clone()
      const nearest = this.kdtree.nearest({ kdX: paths[i].kdX, kdY: paths[i].kdY }, 350)

      if (i % 100 == 0) console.log('-- ', i, " / ", paths.length)
      // console.log('currPath: ', currPath)
      // console.log('nearest: ', nearest)

      if (realVisibility) {
        for (let j = 0; j < nearest.length; j++) {
          if (nearest[j][1] == 0) continue
          let prevPath = nearest[j][0].path
          // console.log('pp: ', prevPath)
          let contained = false
          if (currPath.segments)
            for (let k = 0; k < currPath.segments.length; k++) {
              if (prevPath.contains(currPath.segments[k].point)) {
                contained = true
                k = currPath.segments.length
              }
            }
            if (!contained)
              for (let k = 0; k < prevPath.segments.length; k++) {
                if (currPath.contains(prevPath.segments[k].point)) {
                  contained = true
                  k = prevPath.segments.length
                }
              }
          if (contained || currPath.intersects(prevPath)) {
            currPath = currPath.subtract(prevPath)
          }
        }  
      }

      this.kdtree.insert(paths[i])

      finalPaths.push({ path: currPath, drawRule: paths[i].drawRule })
    }    
    return finalPaths
  }  
}
