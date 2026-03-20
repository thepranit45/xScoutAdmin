package com.xscout.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.xscout.app.ui.screens.AlertsScreen
import com.xscout.app.ui.screens.DashboardScreen
import com.xscout.app.ui.screens.LoginScreen
import com.xscout.app.ui.screens.SessionDetailScreen
import com.xscout.app.ui.screens.SessionsScreen
import com.xscout.app.ui.screens.SettingsScreen
import com.xscout.app.ui.screens.SplashScreen
import com.xscout.app.ui.screens.AddStudentScreen
import com.xscout.app.ui.screens.StudentsScreen

@Composable
fun XScoutNavGraph() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        composable(Routes.SPLASH) {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                },
                onNavigateToDashboard = {
                    navController.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onNavigateToSessions = { navController.navigate(Routes.SESSIONS) },
                onNavigateToStudents = { navController.navigate(Routes.STUDENTS) },
                onNavigateToAlerts   = { navController.navigate(Routes.ALERTS) },
                onNavigateToSettings = { navController.navigate(Routes.SETTINGS) }
            )
        }

        composable(Routes.SESSIONS) {
            SessionsScreen(
                onBack = { navController.popBackStack() },
                onSessionClick = { id -> navController.navigate(Routes.sessionDetail(id)) }
            )
        }

        composable(
            route = Routes.SESSION_DETAIL,
            arguments = listOf(navArgument("sessionId") { type = NavType.StringType })
        ) { backStack ->
            val sessionId = backStack.arguments?.getString("sessionId") ?: ""
            SessionDetailScreen(
                sessionId = sessionId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.STUDENTS) {
            StudentsScreen(
                onBack = { navController.popBackStack() },
                onAddStudent = { navController.navigate(Routes.ADD_STUDENT) }
            )
        }

        composable(Routes.ADD_STUDENT) {
            AddStudentScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.ALERTS) {
            AlertsScreen(onBack = { navController.popBackStack() })
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLogout = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
