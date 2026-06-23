import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { DiagnosticosLgmvController } from './diagnosticos-lgmv.controller'
import { DiagnosticosLgmvService } from './diagnosticos-lgmv.service'

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticosLgmvController],
  providers: [DiagnosticosLgmvService],
})
export class DiagnosticosLgmvModule {}
