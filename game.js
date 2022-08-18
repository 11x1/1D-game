/* 
    * 1D Game
    *
    * Idea from https://mashpoe.github.io/1D-Game/
    * Tried to recreate the base game myself :)
    * Have fun!
    * 
    * - khey
*/

/* Our canvases */
const canvas_2d_map = document.getElementById( '2d_map' );
const ctx = canvas_2d_map.getContext( '2d' );

const canvas_1d_screen = document.getElementById( '1d-screen' );
const ctx1d = canvas_1d_screen.getContext( '2d' );

class vec2_t {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.length = Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

const map_size = new vec2_t( canvas_2d_map.width, canvas_2d_map.height );
const screen_1d_size = new vec2_t( canvas_1d_screen.width, canvas_1d_screen.height );


const map = [
    [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1 ],
    [ 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ]
];

const math = {
    rad: ( deg ) => deg * ( Math.PI / 180 ),
    normalize_yaw: ( yaw ) => {
        while ( yaw < -180 ) yaw += 360;
        while ( yaw > 180 ) yaw -= 360;
        return yaw;
    },
    lerp: ( a, b, t ) => a + ( b - a ) * t,
}

const colors = {
    rgb_to_hex: ( r, g, b ) => {
        return '#' + ( ( 1 << 24 ) + ( r << 16 ) + ( g << 8 ) + b ).toString( 16 ).slice( 1 );
    }
}

/* Angle to forwardvector */
const angle_to_vector = ( angle ) => {
    let p = math.rad( angle.x );
    let y = math.rad( angle.y );
    let cp = Math.cos( p );
    let sy = Math.sin( y );
    let cy = Math.cos( y );
    return new vec2_t( cp*cy, cp*sy )
}

const block_size = new vec2_t( map_size.x / map[ 1 ].length, map_size.y / map.length );

const player_pos = new vec2_t( map_size.x / 2 + 200, map_size.y / 2 + 40 );
const player_radius = 10;
const player_viewangle = new vec2_t( 0, -135 );
const player_fov = 90;
const fog_of_war = 200;

let fov_data = [ ];
let color_data = [ ];
let game_walls = [ ];
for ( let i = 0; i < map.length; i++ ) {
    for ( let j = 0; j < map[ i ].length; j++ ) {
        if ( map[ i ][ j ] == 1 ) {
            game_walls.push( new vec2_t( j * block_size.x, i * block_size.y ) );
        }
    }
}

const intersects = {
    line_to_line: ( A, B, C, D ) => {
        /*
            A - line1 start
            B - line1 end

            C - line2 start
            D - line2 end

            t - aka the amount of length travelled to get to the intersection point

            t = determinant( CD.x * CA.y - CD.y * CA.x ) / determinant( CD.y * AB.x - CD.x * AB.y )

            watch out that right is not 0

            (
            CD vector -> D - C
            CA vector -> A - C
            AB vector -> B - A
            )

            intersection pos = A + AB * t ( vector lerp )
        */

        let left = ( D.x - C.x ) * ( A.y - C.y ) - ( D.y - C.y ) * ( A.x - C.x );
        let right = ( D.y - C.y ) * ( B.x - A.x ) - ( D.x - C.x ) * ( B.y - A.y );

        if ( right != 0 ) {
            const t = left / right;

            // If we are in the range of 0 to 1, we have an intersection
            if ( t >= 0 && t <= 1 ) {
                const pos = new vec2_t( A.x + ( B.x - A.x ) * t, A.y + ( B.y - A.y ) * t )

                // +-0.2 is a hack
                // Intersection point might be about equal to it and those are just safety checks
                // Dumb i know but it works
                if ( pos.x >= Math.min( C.x, D.x ) - 0.2 && pos.x <= Math.max( C.x, D.x ) + 0.2 && pos.y >= Math.min( C.y, D.y ) - 0.2 && pos.y <= Math.max( C.y, D.y ) + 0.2 ) {
                    return {
                        pos: pos,
                        fraction: t,
                        perc: new vec2_t( ( pos.x - C.x ) / ( D.x - C.x ), ( pos.y - C.y ) / ( D.y - C.y ) )
                    };
                }
            }
        }

        return null;
    }
}

const trace = {
    line: ( start, end, wall_blocks ) => {
        const data = {
            init: false,
            hit: false,
            fraction: 1,
            hit_coords: null,
            perc: new vec2_t( 0, 0 )
        }

        let s = start; // * vec2_t
        let e = end; // * vec2_t

        for ( i = 0; i < wall_blocks.length; i++ ) {
            let block_coords = wall_blocks[ i ];

            let right_top_coords = new vec2_t( block_coords.x + block_size.x, block_coords.y );
            let block_end_coords = new vec2_t( block_coords.x + block_size.x, block_coords.y + block_size.y );
            let left_bottom_coords = new vec2_t( block_coords.x, block_coords.y + block_size.y );

            let lines = [
                [ block_coords, right_top_coords ],
                [ right_top_coords, block_end_coords ],
                [ block_end_coords, left_bottom_coords ],
                [ left_bottom_coords, block_coords ],
            ]

            for ( let line of lines ) {
                let intersect_data = intersects.line_to_line( s, e, line[ 0 ], line[ 1 ] );

                if ( intersect_data !== null ) {
                    let vector_to_intersect = new vec2_t( s.x - intersect_data.pos.x, s.y - intersect_data.pos.y );

                    /* Debug line */
                    // ctx.fillText( Math.floor( intersect_data.pos.x ) + ' ' + Math.floor( intersect_data.pos.y ) + '( ' + Math.floor( vector_to_intersect.length ) + ' )', intersect_data.pos.x, intersect_data.pos.y ); 

                    if ( !data.init || vector_to_intersect.length < data.intersect_data.length ) {
                        data.hit = true;
                        data.intersect_data = vector_to_intersect;
                        data.hit_coords = intersect_data.pos;
                        data.fraction = intersect_data.fraction;
                        data.perc = intersect_data.perc;
                        data.init = true;
                    }
                }
            }
        }

        /* Return the data with the closest intersection */
        return data;
    }
}


const input = {
    key_data: { },

    key_to_rotate_amount: {
        'a': -2,
        'd': 2,
    },

    key_to_move_amount: {
        'w': 1,
        's': -1,
    },

    rotate_player: ( amount ) => {
        player_viewangle.y += amount;
        player_viewangle.y = math.normalize_yaw( player_viewangle.y );
    },

    move_player: ( amount ) => {
        player_pos.x += Math.cos( math.rad( player_viewangle.y ) ) * amount;
        player_pos.y += Math.sin( math.rad( player_viewangle.y ) ) * amount;
    },

    can_move: ( amount, walls ) => {
        let predicted_player_pos = new vec2_t( player_pos.x, player_pos.y );
        predicted_player_pos.x += Math.cos( math.rad( player_viewangle.y ) ) * amount;
        predicted_player_pos.y += Math.sin( math.rad( player_viewangle.y ) ) * amount;

        let available_to_move = true;
        for ( let wall of walls ) {
            let wall_start = wall
            let wall_end = new vec2_t( wall.x + block_size.x, wall.y + block_size.y );

            if ( predicted_player_pos.x >= wall_start.x && predicted_player_pos.x <= wall_end.x && predicted_player_pos.y >= wall_start.y && predicted_player_pos.y <= wall_end.y ) {
                available_to_move = false;
                break;
            }
        }

        return available_to_move
    },
}

const input_handler = ( ) => {
    document.addEventListener( 'keydown', ( e ) => {
        /* Handle input */
        const pressed_key = e.key;
        input.key_data[ pressed_key ] = true;
    } );

    document.addEventListener( 'keyup', ( e ) => {
        /* Handle input */
        const pressed_key = e.key;
        input.key_data[ pressed_key ] = false;
    } );
}

const render = {
    draw_line: ( context, start, end, color ) => {
        context.strokeStyle = color || '#fff';
        context.beginPath( );
        context.moveTo( start.x, start.y );
        context.lineTo( end.x, end.y );
        context.stroke( );
        context.closePath( );
    },

    draw_wall: ( context, pos ) => {
        context.fillStyle = '#000';
        context.fillRect( pos.x * block_size.x, pos.y * block_size.y, block_size.x, block_size.y );
    },

    draw_player: ( context, pos ) => {
        /* Render player circle */
        context.fillStyle = '#f00';
        context.beginPath( );
        context.arc( pos.x, pos.y, player_radius, 0, Math.PI*2, true ); 
        context.closePath( );
        context.fill( );

        /* render viewangle line */
        /* Get our viewangle forwardvector */
        let end_pos = angle_to_vector( player_viewangle );

        /* Make the line longer ( radius of circle ) */
        end_pos.x *= player_radius;
        end_pos.y *= player_radius;

        /* Render line from player origin to player origin + our forwarded vector */
        render.draw_line( context, pos, new vec2_t( pos.x + end_pos.x, pos.y + end_pos.y ), '#0f0' );
    },

    debug: {
        draw_fov: ( context, fov ) => {
            const eye_pos = new vec2_t( player_pos.x, player_pos.y );

            const max_length = fog_of_war;
            
            let fov_index = 0;
            let base_length = fog_of_war;


            for ( let i = -fov / 2; i < fov / 2; i += 0.1 ) {
                const current_angle = new vec2_t( 0, math.normalize_yaw( player_viewangle.y + i ) );
                const middle_fov = angle_to_vector( current_angle );
                middle_fov.x *= max_length;
                middle_fov.y *= max_length;

                const trace_data = trace.line( eye_pos, new vec2_t( eye_pos.x + middle_fov.x, eye_pos.y + middle_fov.y ), game_walls );
                let c = {
                    r: 0,
                    g: 0,
                    b: 0,
                };

                if ( trace_data.hit_coords !== null ) {
                    render.draw_line( context, eye_pos, trace_data.hit_coords, '#0f0' );

                    if ( trace_data.perc.x > 0 && trace_data.perc.x < 0.5  ) {
                        c.r = 255;
                    } else if ( trace_data.perc.x >= 0.5 && trace_data.perc.x < 1 ) {
                        c.g = 255;
                    }

                    if ( trace_data.perc.y > 0 && trace_data.perc.y < 0.5  ) {
                        c.r = 255;
                    } else if ( trace_data.perc.y >= 0.5 && trace_data.perc.y < 1 ) {
                        c.g = 255;
                    }
                } else {
                    render.draw_line( context, eye_pos, new vec2_t( eye_pos.x + middle_fov.x, eye_pos.y + middle_fov.y ), '#f00' );
                }




                fov_data[ fov_index ] = { fraction: trace_data.hit ? trace_data.fraction : 1, hit: trace_data.hit, color: c };
                fov_index++;
            }
        }
    }
}

const render_handler_2d = ( ) => {
    /* Clear the map before drawing it */
    ctx.fillStyle = '#787777';
    ctx.fillRect( 0, 0, canvas_2d_map.width, canvas_2d_map.height );

    /* Draw walls */
    for ( let y = 0; y < map.length; y++ ) {
        for ( let x = 0; x < map[y].length; x++ ) {
            if ( map[y][x] == 1 ) {
                render.draw_wall( ctx, new vec2_t( x, y ) );
            }
        }
    }

    /* Update player */
    if ( input.key_data[ 'a' ] || input.key_data[ 'd' ] ) {
        let pressed = input.key_data[ 'a' ] ? 'a' : 'd';
        const rotate_amount = input.key_to_rotate_amount[ pressed ];
        if ( rotate_amount ) {
            input.rotate_player( rotate_amount );
        }
    }
    
    if ( input.key_data[ 'w' ] || input.key_data[ 's' ] ) {
        let pressed = input.key_data[ 'w' ] ? 'w' : 's';
        const move_amount = input.key_to_move_amount[ pressed ];
        if ( move_amount && input.can_move( move_amount, game_walls ) ) {
            input.move_player( move_amount );
        }
    }


    /* Draw player */
    render.draw_player( ctx, player_pos );
    render.debug.draw_fov( ctx, player_fov );

    window.requestAnimationFrame( render_handler_2d );
}

const render_handler_1d = ( ) => {
    /* Clear the screen before drawing on it */
    ctx1d.fillStyle = '#000';
    ctx1d.fillRect( 0, 0, screen_1d_size.x, screen_1d_size.y );

    if ( fov_data.length == 0 ) return

    let step = screen_1d_size.x / fov_data.length;

    let counter = 0;
    for ( let data of fov_data ) {
        let color = data.color
        let opacity = Math.abs( Math.log10( data.fraction ) * 255 )

        opacity = opacity > 255 ? 255 : opacity;

        let opacity_hex = colors.rgb_to_hex( opacity, 0, 0 ).substring( 1, 3 );
                
        ctx1d.fillStyle = colors.rgb_to_hex( color.r, color.g, color.b ) + opacity_hex;
        ctx1d.fillRect( counter * step +  data.fraction, 0, step * step, screen_1d_size.y );

        counter++;
    }

   window.requestAnimationFrame( render_handler_1d );
}

window.requestAnimationFrame( render_handler_2d );
window.requestAnimationFrame( render_handler_1d );

input_handler( );
