import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandaComponent } from './demanda.component';

describe('DemandaComponent', () => {
  let component: DemandaComponent;
  let fixture: ComponentFixture<DemandaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemandaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DemandaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
