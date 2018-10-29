"use strict";
$( function () {

    let scene; // three scene
    let world; // cannon world
    let renderer;
    let camera; // perspective camera
    let controls; // orbit controls

    let pb; // static physical base of the pendulum
    let pp1, p1; // first pendulum physics and graphics objects
    let pp2, p2; // second pendulum physics and graphics objects
    let dc1, dc2; // physics constraints acting as the pendulum "arms"
    let arms; // graphical line object representing arms
    let trail; //
    let vah1, vah2; // velocity arrow helper

    let dt = 1 / 60;

    const DAMPING = .01; // pendulum linear damping value
    const DEBUG = true; // show helpers
    const CONTROLS = true; // enable orbit controls
    const ARROWS = true; // arrows attached to pendulum showing its velocity

    function initCannon() {
        world = new CANNON.World();
        world.gravity.set( 0, -10, 0 );
        world.broadphase = new CANNON.NaiveBroadphase();

        let sphereShape = new CANNON.Sphere( 1 );

        pb = new CANNON.Body( {
            mass: 0,
            shape: sphereShape,
            position: new CANNON.Vec3( 0, 0, 0 ),
        } );
        pb.name = 'Pendulum Base';

        pp1 = new CANNON.Body( {
            mass: 1,
            shape: sphereShape,
            position: new CANNON.Vec3( -10, 0, 0 ),
            fixedRotation: true,
            linearDamping: DAMPING,
        } );
        pp1.name = 'PendulumA';

        pp2 = new CANNON.Body( {
            mass: .2,
            shape: sphereShape,
            position: new CANNON.Vec3( -10, 0, -10 ),
            fixedRotation: true,
            linearDamping: DAMPING,
        } );
        pp2.name = 'PendulumB';

        dc1 = new CANNON.DistanceConstraint( pb, pp1 );
        dc2 = new CANNON.DistanceConstraint( pp1, pp2 );

        world.addBody( pb );
        world.addBody( pp1 );
        world.addBody( pp2 );

        world.addConstraint( dc1 );
        world.addConstraint( dc2 );
    }

    function initThree() {
        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer( {
            antialias: true,
        } );
        renderer.setSize( window.innerWidth, window.innerHeight );

        $( '#viewport' ).append( renderer.domElement );

        camera = new THREE.PerspectiveCamera(
            35, // fov
            window.innerWidth / window.innerHeight, // ratio
            1, // near
            1000 // far
        );
        camera.position.set( 0, -10, -50 );
        camera.lookAt( scene.position );

        let sphereGeometry = new THREE.SphereGeometry(
            1, // radius
            14, 14, // h w segments
        );
        let sphereMaterial = new THREE.MeshNormalMaterial();

        p1 = new THREE.Mesh( sphereGeometry, sphereMaterial );
        p2 = new THREE.Mesh( sphereGeometry, sphereMaterial );

        trail = new THREE.Line( new THREE.Geometry, new THREE.LineBasicMaterial );

        let armsGeometry = new THREE.Geometry();
        armsGeometry.vertices.push( new THREE.Vector3() );
        armsGeometry.vertices.push( new THREE.Vector3().copy( pp1.position ) );
        armsGeometry.vertices.push( new THREE.Vector3().copy( pp2.position ) );
        arms = new THREE.Line( armsGeometry, new THREE.LineBasicMaterial );

        vah1 = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pp1.velocity ), // arrow direction
            new THREE.Vector3().copy( pp1.position ), // arrow origin
            pp1.velocity.length, // arrow length
            0x567def, // lightblue color
        );

        vah2 = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pp2.velocity ), // arrow direction
            new THREE.Vector3().copy( pp2.position ), // arrow origin
            pp2.velocity.length, // arrow length
            0x567def, // lightblue color
        );

        scene.add( p1 );
        scene.add( p2 );
        scene.add( trail );
        scene.add( arms );
        scene.add( vah1 );
        scene.add( vah2 );

        if ( DEBUG ) {
            let ah = new THREE.AxesHelper( 20 );
            scene.add( ah );
        }
        if ( CONTROLS ) {
            controls = new THREE.OrbitControls( camera, renderer.domElement );
        }
    }

    function draw() {
        window.requestAnimationFrame( draw );
        world.step( dt );

        p1.position.copy( pp1.position );
        p2.position.copy( pp2.position );

        updateArms();
        updateTrail();
        updateArrows();

        if ( pp1.velocity.length === 0 && pp2.velocity.length === 0 ) {
            reset();
        }

        renderer.render( scene, camera );
    }

    function updateArms() {
        // first vertex stays static at the pendulum base
        arms.geometry.vertices[ 1 ].copy( pp1.position ); // change the endpoint of the [base -> pendulum A] arm
        arms.geometry.vertices[ 2 ].copy( pp2.position ); // change the endpoint of the [A -> B] arm
        arms.geometry.verticesNeedUpdate = true;
    }

    function updateTrail() {
        trail.geometry.vertices.push( new THREE.Vector3().copy( pp2.position ) );

        if ( trail.geometry.vertices.length > 5000 ) {
            trail.geometry.vertices.shift(
                trail.geometry.vertices.length - 5000
            );
        }
        trail.geometry.verticesNeedUpdate = true;
    }

    function updateArrows() {
        scene.remove( vah1 );
        vah1 = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pp1.velocity ), // arrow direction
            new THREE.Vector3().copy( pp1.position ), // arrow origin
            pp1.velocity.length * 10, // arrow length
            0x567def, // lightblue color
        );
        scene.add( vah1 );

        scene.remove( vah2 );
        vah2 = new THREE.ArrowHelper(
            new THREE.Vector3().copy( pp2.velocity ), // arrow direction
            new THREE.Vector3().copy( pp2.position ), // arrow origin
            pp2.velocity.length * 10, // arrow length
            0x567def, // lightblue color
        );
        scene.add( vah2 );
    }

    function reset() {
        pp1.position.set( -10, 0, 0 );
        pp2.position.set( -10, 0, -10 );

        trail.geometry.vertices.length = 0;

        updateArms();
        updateTrail();
        updateArrows();
    }

    // run
    initCannon();
    initThree();
    window.requestAnimationFrame( draw );

    window.scene = scene;
    window.world = world;
    window.camera = camera;
    window.vah1 = vah1;
    window.vah2 = vah2;
    window.trail = trail;
} );