import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { COMMON_IMPORTS } from './imports';

@NgModule({
  declarations: [],
  imports: [   
    BrowserModule, 
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [...COMMON_IMPORTS],
  bootstrap: []
})
export class AppModule { }