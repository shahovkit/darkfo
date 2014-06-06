var Combat = function(objects, player) {
	this.critters = []
	for(var i = 0; i < objects.length; i++) {
		if(objects[i].type === "critter") {
			this.critters.push(objects[i])

			if(objects[i].stats === undefined)
				objects[i].stats = this.getDefaultStats(objects[i])
			if(objects[i].hp === undefined)
				objects[i].hp = 100
			objects[i].dead = false
		}
	}

	this.AP = new Array(this.critters.length)
	this.player = player
	this.turnNum = 0
	this.whoseTurn = -2
	this.inPlayerTurn = false
}

Combat.prototype.fireDistance = function(obj) {
	return 5; // todo: get some distance before firing
}

Combat.prototype.getDefaultStats = function(obj) {
	return {str: 4, per: 5, end: 5, chr: 1, int: 1, agi: 1, luk: 1}
}

Combat.prototype.getMaxAP = function(obj) {
	return 5 + Math.floor(obj.stats.agi/2)
}

Combat.prototype.getDamageDone = function(obj, target) {
	return 55
}

Combat.prototype.shoot = function(obj, target, callback) {
	if(obj.isPlayer) {
		critterStaticAnim(player, "shoot", callback)
	}
	else {
		// if we have a punch animation, use that, otherwise default to idling
		if(critterHasAnim(obj, "shoot"))
			critterStaticAnim(obj, "shoot", callback)
		else if(critterHasAnim(obj, "punch"))
			critterStaticAnim(obj, "punch", callback)
		else critterStaticAnim(obj, "static-idle", callback)
	}

	var damage = this.getDamageDone(obj, target)
	var who = obj.isPlayer ? "You" : "An NPC"
	console.log(who + " hit the target for " + damage + " damage")
	target.hp -= damage

	if(target.hp <= 0) {
		console.log("...And killed them.")
		target.dead = true
		// todo: death animation
	}
}

Combat.prototype.doAITurn = function(obj, idx) {
	var that = this
	var distance = hexDistance(obj.position, this.player.position)
	var AP = this.AP[idx]

	if(AP <= 0) { // out of AP
		this.nextTurn()
		return
	}

	// behaviors

	var fireDistance = this.fireDistance(obj)
	if(distance > fireDistance) {
		// todo: some sane direction, and also path checking
		console.log("[AI CREEPS]")
		var neighbors = hexNeighbors(this.player.position)
		var maxDistance = Math.min(this.AP[idx], fireDistance)
		
		for(var i = 0; i < neighbors.length; i++) {
			if(critterWalkTo(obj, neighbors[i], false, function() {
				critterStopWalking(obj)
				that.doAITurn(obj, idx)
			}, maxDistance) !== false) {
				// OK
				this.AP[idx] -= obj.path.path.length
				return
			}
		}

		// no path
		console.log("[NO PATH]")
		that.doAITurn(obj, idx)
	}
	else if(AP >= 4) {
		console.log("[SHOOTING]")
		this.AP[idx] -= 4
		// turn towards player
		// todo: actually do that
		this.shoot(obj, this.player, function() {
			critterStopWalking(obj)
			that.doAITurn(obj, idx)
		})
	}
	else this.nextTurn()
}

Combat.prototype.nextTurn = function() {
	this.whoseTurn++
	if(this.whoseTurn >= this.critters.length) {
		// end of turn
		this.whoseTurn = -1
	}

	if(this.whoseTurn === -1) {
		// player
		this.inPlayerTurn = true
		this.player.AP = this.getMaxAP(this.player)
	}
	else {
		this.inPlayerTurn = false
		var critter = this.critters[this.whoseTurn]
		if(critter.dead === true)
			return this.nextTurn()
		this.AP[this.whoseTurn] = this.getMaxAP(critter) // reset AP
		this.doAITurn(critter, this.whoseTurn)
	}
}