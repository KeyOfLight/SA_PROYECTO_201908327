


export const Backend = {
    routes: {
        login: '/auth/login',
        register: '/auth/register',
        catalogValidate: '/catalog/validate-items',
        catalogRestaurants: '/catalog/restaurants',
        catalogMenuItems: '/catalog/menu-items',
        orders: '/orders',
        ordersRestaurant: '/orders/restaurant',
        auth: '/auth/validate-token',
    },
    backend_route: 'http://34.71.238.112:3000/api',
    jwt_token: 'jwt_token_deliver_eats_app',
    USER_KEY: 'user_data'

}