const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLogin() {
  try {
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    
    console.log('✅ Usuario encontrado:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
    
    if (!user.password) {
      console.log('❌ El usuario no tiene contraseña');
      return;
    }
    
    console.log('✅ El usuario tiene contraseña configurada');
    console.log('\n📧 Intenta iniciar sesión con:');
    console.log('   Email:', user.email);
    console.log('   Password: La que configuraste durante el seed');
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogin();
