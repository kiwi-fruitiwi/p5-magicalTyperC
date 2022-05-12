/* a PVector wrapper used to enable steering behaviors and physics sims */
class Vehicle {
    constructor(x, y, n) {
        this.pos = new p5.Vector(0, 0)
        this.vel = new p5.Vector(0, 0)
        this.acc = new p5.Vector(0, 0)
        this.target = new p5.Vector(x, y)
        this.maxspeed = 5
        this.maxforce = 2
    }


    /** applies arrival behavior, sending this vehicle to its 'home' */
    returnHome(radius) {
        let arrive = this.arrive(this.target, radius)
        this.applyForce(arrive)
    }


    seek(target) {
        /* this gives you a vector pointing from us to the target */
        let desired = p5.Vector.sub(target, this.pos)
        desired.setMag(this.maxspeed)

        /* steering = desired - current */
        let steer = p5.Vector.sub(desired, this.vel)
        return steer.limit(this.maxforce)
    }


    flee(target) {
        return this.seek(target).mult(-1)
    }


    /** like seek, but we slow down as we approach our target :3 */
    arrive(target, radius) {
        /* this gives you a vector pointing from us to the target */
        let desired = p5.Vector.sub(target, this.pos)

        /* the distance between two points is the magnitude of the
            vector from one to the other */
        let distance = desired.mag()

        let speed = this.maxspeed
        if (distance < radius) {
            speed = map(distance, 0, 100, 0, this.maxspeed)
        }

        desired.setMag(speed)

        /* steering = desired - current */
        let steer = p5.Vector.sub(desired, this.vel)
        return steer.limit(this.maxforce)
    }


    applyForce(f) {
        /* F=ma, but we assume m=1, so F=a */
        this.acc.add(f)
        this.acc.limit(this.maxforce)
    }


    update() {
        this.pos.add(this.vel)
        this.vel.add(this.acc)
        this.vel.limit(this.maxspeed)
        this.vel.mult(0.995) // friction
        this.acc.mult(0)
    }
}