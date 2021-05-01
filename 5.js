const canvasSketch = require('canvas-sketch');
const { renderPaths, createPath, pathsToPolylines } = require('canvas-sketch-util/penplot');
const { clipPolylinesToBox } = require('canvas-sketch-util/geometry');
const Random = require('canvas-sketch-util/random');
const p5 = require('p5');
const random = require('canvas-sketch-util/random');

new p5()

// You can force a specific seed by replacing this with a string value
const defaultSeed = '';

// Set a random seed so we can reproduce this print later
Random.setSeed(defaultSeed || Random.getRandomSeed());

// Print to console so we can see which seed is being used and copy it if desired
console.log('Random Seed:', Random.getSeed());

const settings = {
  suffix: Random.getSeed(),
  dimensions: 'A4',
  orientation: 'portrait',
  pixelsPerInch: 300,
  scaleToView: true,
  units: 'cm'
};

class Dot {
  constructor(x, y, gravity) {
    this.pos = createVector(x, y);
    this.oldpos = createVector(x, y);
    
    this.friction = 0.4;
    this.groundFriction = 0.7;
    
    this.gravity = gravity || createVector(0, 0);    
    
    this.radius = 5;
    this.color = '#e62a4f';
    this.mass = 1;
  } 
  update() {
    let vel = p5.Vector.sub(this.pos, this.oldpos);
    vel.mult(this.friction);    
    this.oldpos.set(this.pos.x, this.pos.y);
    this.pos.add(vel);
    this.pos.add(this.gravity);
  }
  render(p) {
    // p.arc(this.pos.x, this.pos.y, 0.5, 0, 2 * Math.PI);
    p.moveTo(this.pos.x, this.pos.y)
    p.lineTo(this.oldpos.x, this.oldpos.y)
    /*
    fill(this.color);
    noStroke()
    circle(this.pos.x, this.pos.y, 1)
    stroke(this.color)
    noFill()
    line(this.pos.x, this.pos.y, this.oldpos.x, this.oldpos.y)
    */
  }
}

class Stick {
  constructor(p1, p2, length) {
    this.startPoint = p1;
    this.endPoint = p2;
    this.stiffness = 2;
    this.color = '#f5476a';
    
    // if the length is not given then calculate the distance based on position
    if (!length) {
      this.length = this.startPoint.pos.dist(this.endPoint.pos);
    } else {
      this.length = length;
    }    
  }
  update() {
    // calculate the distance between two dots
    let dx = this.endPoint.pos.x - this.startPoint.pos.x;
    let dy = this.endPoint.pos.y - this.startPoint.pos.y;
    // pythagoras theorem
    let dist = Math.sqrt(dx * dx + dy * dy);
    // calculate the resting distance betwen the dots
    let diff = (this.length - dist) / dist * this.stiffness;

    // getting the offset of the points
    let offsetx = dx * diff * 0.5;
    let offsety = dy * diff * 0.5;

    // calculate mass
    let m1 = this.startPoint.mass + this.endPoint.mass;
    let m2 = this.startPoint.mass / m1;
    m1 = this.endPoint.mass / m1;

    // and finally apply the offset with calculated mass
    if (!this.startPoint.pinned) {
      this.startPoint.pos.x -= offsetx * m1;
      this.startPoint.pos.y -= offsety * m1;
    }
    if (!this.endPoint.pinned) {
      this.endPoint.pos.x += offsetx * m2;
      this.endPoint.pos.y += offsety * m2;
    }
  }
  render(p) {
    p.moveTo(this.startPoint.pos.x, this.startPoint.pos.y)
    p.lineTo(this.endPoint.pos.x, this.endPoint.pos.y)
    // line(this.startPoint.pos.x, this.startPoint.pos.y, this.endPoint.pos.x, this.endPoint.pos.y)
  }
}

function getPosition(i, width, height) {
  let x, y 
  let start = 32850
  let cnt = 1000
  i = map(i, 0, 2000, start, start + cnt)
  const startY = (i - start)
  // y = ((Math.cos(i / 7)) * 40 + i + 50) / 10 + 1
  const scaleY = 1 / (15 + Math.cos(i / 30) * 2)
  y = ((Math.cos(i / 7)) * 40 + startY + 50) * scaleY
  const heightFactor = 1//0.2 + map(y, 0, height, 0.8, 0)
  console.log(i, heightFactor)
  // const scaleX = 1 / (2 + Math.sin(i / 5) * 0.8)
  const scaleX = 1 / (2 + random.noise1D(i, 0.02, 0.8))
  x = ((Math.sin(i / 8) + 1) * (width * heightFactor / 1.6) / 2 + width / 4 + width / 8 * (1 - heightFactor)) * scaleX - 1
  return {
    x: x / 3,
    y: y / 3
  }
}

const sketch = (props) => {
  const { width, height, units } = props;

  // Holds all our 'path' objects
  // which could be from createPath, or SVGPath string, or polylines
  const paths = [];

  let dots = [], sticks = []
  const noPoints = 2000
  const weightLimit = 2000
  for (let i = 0; i < noPoints; i++) {
    const pos = getPosition(i, width, height)
    if (i < weightLimit) {
      // const weightVal = random.noise1D(i / 2, 1, 0.15)
      // const weightVal = random.noise1D(i / 2, 10, 0.0 + 0.3 * ((weightLimit - i) / weightLimit))
      // const weightVal = Math.abs(random.noise1D(i / 2, 1, 0.05))
      // const weightVal = weightLimit / 3000
      // const weightVal = ((weightLimit - i) / weightLimit) / 150 + random.noise1D(i, 0.008, 0.008)
      const weightVal = Math.sin(((weightLimit - i) / weightLimit) / 950) / 1000 + random.noise1D(i, 0.008, 0.008)
      // const weightVal = (weightLimit) / 50000 //+ random.noise1D(i, 0.01, 0.008)
      dots.push(new Dot(pos.x, pos.y, createVector(0, weightVal))); 
    } else {
      dots.push(new Dot(pos.x, pos.y)); 
    }    
    if (i > 0) {
      sticks.push(new Stick(dots[i - 1], dots[i]))
    }
  }

  console.log(dots)

  for (let frames = 0; frames < 7; frames++) {
    for (let solver = 0; solver < 8; solver++) {
      for (let d of dots) {      
        d.update();
      }
      for (let s of sticks) {      
        s.update()
      }    
    }
    const p1 = createPath()
    for (let d of dots) {      
      // d.constrain();
      // d.render(p1);
    }
    paths.push(p1)

    const p = createPath()
    for (let s of sticks) {      
      // s.update()
      s.render(p)
    }  
    paths.push(p)
  }

  // Convert the paths into polylines so we can apply line-clipping
  // When converting, pass the 'units' to get a nice default curve resolution
  let lines = pathsToPolylines(paths, { units });

  // Clip to bounds, using a margin in working units
  const margin = 1; // in working 'units' based on settings
  const actualMargin = 0.1
  const box = [ actualMargin, actualMargin, width - actualMargin, height - actualMargin ];
  lines = clipPolylinesToBox(lines, box);

  // The 'penplot' util includes a utility to render
  // and export both PNG and SVG files
  return props => renderPaths(lines, {
    ...props,
    lineJoin: 'round',
    lineCap: 'round',
    // in working units; you might have a thicker pen
    lineWidth: 0.038,
    // Optimize SVG paths for pen plotter use
    optimize: true
  });
};

canvasSketch(sketch, settings);
