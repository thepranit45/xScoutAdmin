package com.xscout.app.ui.navigation

object Routes {
    const val SPLASH    = "splash"
    const val LOGIN     = "login"
    const val DASHBOARD = "dashboard"
    const val SESSIONS  = "sessions"
    const val SESSION_DETAIL = "session_detail/{sessionId}"
    const val STUDENTS  = "students"
    const val ALERTS    = "alerts"
    const val SETTINGS  = "settings"
    const val ADD_STUDENT = "add_student"

    fun sessionDetail(sessionId: String) = "session_detail/$sessionId"
}
