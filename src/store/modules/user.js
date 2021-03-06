import {login, logout, getInfo} from '@/data/modules/user'
import {getToken, setToken, removeToken} from '@/utils/auth'
import router, {resetRouter} from '@/router'

const state = {
    token: getToken(),
    nickname: '',
    avatar: '',
    introduction: '',
    info:{},
    roles: []
}

const mutations = {
    SET_TOKEN: (state, token) => {
        state.token = token
    },
    SET_INTRODUCTION: (state, introduction) => {
        state.introduction = introduction
    },
    SET_NICK_NAME: (state, nickname) => {
        state.nickname = nickname;
    },
    SET_AVATAR: (state, avatar) => {
        state.avatar = avatar
    },
    SET_INFO: (state, info) => {
        state.info = info;
    },
    SET_ROLES: (state, roles) => {
        state.roles = roles
    }
}

const actions = {
    // user login
    login({commit}, userInfo) {
        const {username, password} = userInfo;
        return new Promise((resolve, reject) => {
            login({username: username.trim(), password: password}).then(response => {
                if(response.status === 0){
                    commit('SET_TOKEN', username.trim());
                    commit('SET_INFO',response.data);
                    commit('SET_NICK_NAME',response.data.nickname || response.data.name);
                    commit('SET_ROLES',response.data.role.split(',').map(item=>parseInt(item)));
                    setToken(username.trim());
                    resolve();
                }else{
                    reject(response);
                }
            }).catch(error => {
                reject(error);
            })
        })
    },

    // get user info
    getInfo({commit, state}) {
        return new Promise((resolve, reject) => {
            getInfo(state.token).then(response => {
                const {data} = response

                if (!data) {
                    reject('Verification failed, please Login again.')
                }

                const {roles, name, avatar, introduction} = data

                // roles must be a non-empty array
                if (!roles || roles.length <= 0) {
                    reject('getInfo: roles must be a non-null array!')
                }

                commit('SET_ROLES', roles)
                commit('SET_NAME', name)
                commit('SET_AVATAR', avatar)
                commit('SET_INTRODUCTION', introduction)
                resolve(data)
            }).catch(error => {
                reject(error)
            })
        })
    },

    // user logout
    logout({commit, state}) {
        return new Promise((resolve, reject) => {
            logout(state.token).then(() => {
                commit('SET_TOKEN', '');
                commit('SET_ROLES', []);
                commit('SET_INFO',{});
                commit('SET_NICK_NAME','');
                removeToken();
                resetRouter();
                resolve();
            }).catch(error => {
                reject(error)
            })
        })
    },

    // remove token
    resetToken({commit}) {
        return new Promise(resolve => {
            commit('SET_TOKEN', '')
            commit('SET_ROLES', [])
            removeToken()
            resolve()
        })
    },

    // dynamically modify permissions
    changeRoles({commit, dispatch}, role) {
        return new Promise(async resolve => {
            const token = role + '-token'

            commit('SET_TOKEN', token)
            setToken(token)

            const {roles} = await dispatch('getInfo')

            resetRouter()

            // generate accessible routes map based on roles
            const accessRoutes = await dispatch('permission/generateRoutes', roles, {root: true})

            // dynamically add accessible routes
            router.addRoutes(accessRoutes)

            // reset visited views and cached views
            dispatch('tagsView/delAllViews', null, {root: true})

            resolve()
        })
    }
}

const getters = {
    nickname:state => state.nickname,
    info:state => state.info,
    roles:state => state.roles
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters
}
